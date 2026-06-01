"""
Telegram bot that wraps the existing DeCentra chat service.
Starts polling on FastAPI startup — sends user messages to RAGFlow
and voice messages through Alem STT → RAGFlow.
Sends daily morning/evening briefings to all subscribers.
"""
from __future__ import annotations

import json
import logging
from datetime import time, datetime
from typing import Any

import httpx
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from services.telegram_bot.config import telegram_settings
from services.ragflow.config import ragflow_settings
from services.alemllm.config import alemllm_settings
from services.chat.prompts import build_system_prompt
from services.voice.config import voice_stt_settings
from services.telegram_bot.plain_text import prepare_telegram_text

ALEMLLM_API_URL = "https://llm.alem.ai/v1/chat/completions"

logger = logging.getLogger(__name__)

TIMEOUT = httpx.Timeout(timeout=60.0, read=60.0)
TEMPERATURE = 0.4

# Per-user conversation history (in-memory, resets on restart — fine for hackathon)
_conversations: dict[int, list[dict[str, str]]] = {}
MAX_HISTORY = 20

# Users who receive daily briefings (all who ever messaged the bot)
_subscribers: set[int] = set()
# Seed subscribers — always receive briefings (add chat IDs here)
_seed_subscribers: list[int] = [1849840870]

# Astana timezone offset (UTC+5)
ASTANA_UTC_OFFSET = 5

# Open-Meteo API (free, no key) for real-time Astana weather
OPEN_METEO_URL = (
    "https://api.open-meteo.com/v1/forecast"
    "?latitude=51.13&longitude=71.43"
    "&daily=sunrise,sunset,uv_index_max,daylight_duration,sunshine_duration,temperature_2m_max,temperature_2m_min"
    "&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m"
    "&timezone=Asia/Almaty&forecast_days=2"
)

# WMO weather codes → human-readable
_WMO_CODES = {
    0: "ясно", 1: "преимущественно ясно", 2: "переменная облачность", 3: "пасмурно",
    45: "туман", 48: "туман с инеем",
    51: "лёгкая морось", 53: "морось", 55: "сильная морось",
    61: "небольшой дождь", 63: "дождь", 65: "сильный дождь",
    71: "небольшой снег", 73: "снег", 75: "сильный снег",
    80: "ливень", 81: "сильный ливень", 95: "гроза",
}


async def _fetch_astana_weather() -> dict | None:
    """Fetch real-time weather data for Astana from Open-Meteo."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(OPEN_METEO_URL)
        if resp.status_code != 200:
            return None
        data = resp.json()

        current = data.get("current", {})
        daily = data.get("daily", {})

        weather_code = current.get("weather_code", 0)
        today_sunshine = daily.get("sunshine_duration", [0])[0]
        today_daylight = daily.get("daylight_duration", [0])[0]

        return {
            "date": daily["time"][0],
            "sunrise": daily["sunrise"][0].split("T")[1],
            "sunset": daily["sunset"][0].split("T")[1],
            "uv_max": daily["uv_index_max"][0],
            "temp_now": current.get("temperature_2m"),
            "temp_max": daily.get("temperature_2m_max", [None])[0],
            "temp_min": daily.get("temperature_2m_min", [None])[0],
            "wind": current.get("wind_speed_10m"),
            "humidity": current.get("relative_humidity_2m"),
            "weather": _WMO_CODES.get(weather_code, f"код {weather_code}"),
            "daylight_hours": round(today_daylight / 3600, 1),
            "sunshine_hours": round(today_sunshine / 3600, 1),
            # Tomorrow
            "tomorrow_date": daily["time"][1] if len(daily["time"]) > 1 else None,
            "tomorrow_sunrise": daily["sunrise"][1].split("T")[1] if len(daily["sunrise"]) > 1 else None,
            "tomorrow_sunset": daily["sunset"][1].split("T")[1] if len(daily["sunset"]) > 1 else None,
            "tomorrow_uv": daily["uv_index_max"][1] if len(daily["uv_index_max"]) > 1 else None,
            "tomorrow_sunshine": round(daily["sunshine_duration"][1] / 3600, 1) if len(daily.get("sunshine_duration", [])) > 1 else None,
        }
    except Exception as e:
        print(f"[Weather] Failed to fetch: {e}", flush=True)
        return None


def _build_morning_prompt(w: dict) -> str:
    return f"""Сегодня {w['date']}. Реальные данные по Астане прямо сейчас:
- Погода: {w['weather']}, температура: {w['temp_now']}°C (мин {w['temp_min']}°C, макс {w['temp_max']}°C)
- Ветер: {w['wind']} км/ч, влажность: {w['humidity']}%
- Восход: {w['sunrise']}, Закат: {w['sunset']}
- Световой день: {w['daylight_hours']} часов
- Прогноз солнечных часов: {w['sunshine_hours']}ч
- UV индекс (макс): {w['uv_max']}

На основе этих РЕАЛЬНЫХ данных и своей базы знаний, сгенерируй утренний брифинг Kolenke.

Включи:
1. ☀️ Солнечные данные на сегодня (используй реальные цифры выше)
2. 🌡️ UV индекс и рекомендации (при UV≥6 — осторожность, при UV≥8 — опасно)
3. 👷 Совет для строительных бригад: при температуре ≥32.5°C ротация каждые 15-20 мин (ТК РК ст.82). Сегодня нужна ротация?
4. ☀️ Солнечные панели: оценка выработки на сегодня (при {w['sunshine_hours']}ч солнца панель 400Вт выдаст ~X кВт·ч)
5. 🌳 Сезонный совет по озеленению или квартирам

Формат: короткий, с эмодзи, для Telegram. Только plain text, без Markdown, без заголовков и без символов вроде ###, ** и ---. Максимум 400 слов. Используй реальные цифры, не выдумывай."""


def _build_evening_prompt(w: dict) -> str:
    return f"""Сегодня {w['date']}. Итоги солнечного дня в Астане:
- Погода: {w['weather']}, температура: {w['temp_now']}°C
- Световой день: {w['daylight_hours']} часов
- Солнечных часов сегодня: {w['sunshine_hours']}ч
- UV индекс (макс): {w['uv_max']}

Прогноз на завтра ({w['tomorrow_date']}):
- Восход: {w['tomorrow_sunrise']}, Закат: {w['tomorrow_sunset']}
- UV индекс: {w['tomorrow_uv']}
- Прогноз солнечных часов: {w['tomorrow_sunshine']}ч

На основе этих РЕАЛЬНЫХ данных и базы знаний, сгенерируй вечерний брифинг Kolenke.

Включи:
1. 📊 Итоги дня (солнечные часы, какой был день)
2. 🔮 Прогноз на завтра (используй реальные данные выше)
3. 🏠 Сезонный совет для покупателей квартир
4. 🌳 Сезонный совет по озеленению
5. ⚡ Факт про солнечную энергию в Казахстане

Формат: короткий, с эмодзи, для Telegram. Только plain text, без Markdown, без заголовков и без символов вроде ###, ** и ---. Максимум 400 слов. Используй реальные цифры, не выдумывай."""


def _get_history(user_id: int) -> list[dict[str, str]]:
    return _conversations.setdefault(user_id, [])


def _trim_history(history: list[dict[str, str]]) -> None:
    while len(history) > MAX_HISTORY:
        history.pop(0)


def _parse_suggestions(text: str) -> tuple[str, list[str]]:
    marker = "[SUGGESTIONS]"
    idx = text.find(marker)
    if idx == -1:
        return text.strip(), []
    clean = text[:idx].strip()
    suggestions = []
    for line in text[idx + len(marker):].strip().splitlines():
        line = line.strip()
        if line.startswith("- "):
            suggestions.append(line[2:].strip())
        elif line:
            suggestions.append(line)
    return clean, suggestions


async def _call_llm(messages: list[dict[str, str]], language: str = "en") -> str:
    """Call RAGFlow chat API — RAG-grounded answers (~3s)."""
    system_prompt = build_system_prompt(context=None, language=language, channel="telegram")
    api_messages = [{"role": "system", "content": system_prompt}] + messages

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.post(
                ragflow_settings.chat_completions_url,
                headers={
                    "Authorization": f"Bearer {ragflow_settings.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "ragflow",
                    "messages": api_messages,
                },
            )
        if resp.status_code != 200:
            logger.error("RAGFlow API error %s: %s", resp.status_code, resp.text[:200])
            return "Sorry, the AI service is temporarily unavailable. Please try again."

        # RAGFlow always returns SSE — collect delta content from chunks
        full_content = []
        for line in resp.text.splitlines():
            if not line.startswith("data:"):
                continue
            payload = line[len("data:"):].strip()
            if payload == "[DONE]":
                break
            try:
                chunk = json.loads(payload)
                delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content")
                if delta:
                    full_content.append(delta)
            except json.JSONDecodeError:
                continue
        content = "".join(full_content)
        clean_text, suggestions = _parse_suggestions(content)

        if suggestions:
            clean_text += "\n\n💡 " + " | ".join(suggestions)

        clean_text = prepare_telegram_text(clean_text)
        return clean_text or "I couldn't generate a response. Please try again."

    except Exception as e:
        logger.exception("RAGFlow call failed: %s", e)
        return "Sorry, something went wrong. Please try again."


async def _call_llm_direct(prompt: str) -> str:
    """Call AlemLLM directly (no RAG) — for briefings with pre-injected data."""
    system = (
        "Ты — Kolenke, интеллектуальный помощник по солнечному свету Астаны и не только. "
        "Отвечай кратко, с эмодзи, для Telegram. Пиши только обычным текстом, без Markdown и без декоративных разделителей. "
        "Не используй символы вроде #, ##, ###, **, __, ---, ``` и не делай заголовки. Используй только реальные данные из промпта. "
        "Ссылайся на нормы: СН РК 2.04-01-2011 (инсоляция 2.5ч), ТК РК ст.82 (ротация при ≥32.5°C), "
        "Закон о ВИЭ (до 200кВт в сеть). Астана: GHI ~1400 кВт·ч/м²/год, панель 400Вт ~467 кВт·ч/год."
    )
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.post(
                ALEMLLM_API_URL,
                headers={
                    "Authorization": f"Bearer {alemllm_settings.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": alemllm_settings.model_name,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt},
                    ],
                },
            )
        if resp.status_code != 200:
            print(f"[Briefing] AlemLLM error {resp.status_code}: {resp.text[:200]}", flush=True)
            return ""
        data = resp.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return prepare_telegram_text(content)
    except Exception as e:
        print(f"[Briefing] AlemLLM call failed: {e}", flush=True)
        return ""


async def _transcribe_audio(audio_bytes: bytes, filename: str = "voice.ogg") -> str | None:
    """Send audio to Alem STT API and return transcribed text."""
    if not voice_stt_settings.api_key:
        return None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                voice_stt_settings.api_url,
                headers={"Authorization": f"Bearer {voice_stt_settings.api_key}"},
                files={"file": (filename, audio_bytes, "audio/ogg")},
                data={"model": voice_stt_settings.model_name},
            )

        if resp.status_code != 200:
            logger.error("STT API error %s: %s", resp.status_code, resp.text[:200])
            return None

        text = resp.json().get("text", "").strip()
        return text if text else None

    except Exception as e:
        logger.exception("STT call failed: %s", e)
        return None


def _detect_language(text: str) -> str:
    """Simple heuristic: if mostly Cyrillic, assume Russian; else English."""
    cyrillic = sum(1 for c in text if '\u0400' <= c <= '\u04ff')
    return "ru" if cyrillic > len(text) * 0.3 else "en"


# ─── Daily Briefings ──────────────────────────────────────────────────

TELEGRAM_API = f"https://api.telegram.org/bot{telegram_settings.bot_token}"


async def _send_telegram_message(chat_id: int, text: str) -> bool:
    """Send message via direct HTTP — works even when polling is conflicted."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{TELEGRAM_API}/sendMessage",
                json={"chat_id": chat_id, "text": prepare_telegram_text(text)[:4096]},
            )
        return resp.status_code == 200
    except Exception as e:
        print(f"[Briefing] Failed to send to {chat_id}: {e}", flush=True)
        return False


async def _send_briefing(context: ContextTypes.DEFAULT_TYPE, prompt: str, label: str) -> None:
    """Generate a briefing via RAGFlow and send to all subscribers."""
    all_users = _subscribers | set(_seed_subscribers)
    print(f"[Briefing] {label} triggered. Users: {all_users}", flush=True)

    if not all_users:
        print(f"[Briefing] No subscribers for {label} briefing", flush=True)
        return

    print(f"[Briefing] Generating {label} briefing for {len(all_users)} users...", flush=True)
    briefing = await _call_llm_direct(prompt)

    if not briefing or "sorry" in briefing.lower():
        print(f"[Briefing] Failed to generate {label} briefing", flush=True)
        return

    header = "☀️ Утренний брифинг Kolenke\n\n" if label == "morning" else "🌙 Вечерний брифинг Kolenke\n\n"
    message = header + briefing

    for user_id in all_users:
        ok = await _send_telegram_message(user_id, message)
        print(f"[Briefing] Sent to {user_id}: {'OK' if ok else 'FAIL'}", flush=True)


async def _morning_briefing(context: ContextTypes.DEFAULT_TYPE) -> None:
    weather = await _fetch_astana_weather()
    if not weather:
        print("[Briefing] Skipping morning — weather fetch failed", flush=True)
        return
    prompt = _build_morning_prompt(weather)
    await _send_briefing(context, prompt, "morning")


async def _evening_briefing(context: ContextTypes.DEFAULT_TYPE) -> None:
    weather = await _fetch_astana_weather()
    if not weather:
        print("[Briefing] Skipping evening — weather fetch failed", flush=True)
        return
    prompt = _build_evening_prompt(weather)
    await _send_briefing(context, prompt, "evening")


# ─── Handlers ──────────────────────────────────────────────────────────

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    _subscribers.add(user_id)
    _conversations.pop(user_id, None)
    await update.message.reply_text(
        "☀️ Kolenke — Астана\n\n"
        "Я интеллектуальный помощник по солнечному свету.\n\n"
        "🏠 Квартиры — инсоляция, нормы, стоимость\n"
        "🌳 Озеленение — где сажать деревья\n"
        "👷 Рабочие — ротация при жаре/холоде\n"
        "☀️ Солнечные панели — размещение и выработка\n\n"
        "📬 Вы подписаны на ежедневные брифинги (утро + вечер)\n"
        "Отписаться: /unsubscribe\n"
        "Сбросить диалог: /clear",
    )


async def cmd_clear(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    _conversations.pop(user_id, None)
    await update.message.reply_text("🔄 Диалог сброшен. Задайте вопрос!")


async def cmd_subscribe(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    _subscribers.add(user_id)
    await update.message.reply_text("📬 Вы подписаны на ежедневные брифинги Kolenke (утро 7:00, вечер 20:00 по Астане).")


async def cmd_unsubscribe(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    _subscribers.discard(user_id)
    await update.message.reply_text("🔕 Вы отписались от ежедневных брифингов.")


async def cmd_briefing(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send an instant briefing on demand."""
    user_id = update.effective_user.id
    _subscribers.add(user_id)
    await update.message.chat.send_action("typing")
    weather = await _fetch_astana_weather()
    if not weather:
        await update.message.reply_text("Не удалось получить данные о погоде. Попробуйте позже.")
        return
    hour = datetime.utcnow().hour + ASTANA_UTC_OFFSET
    prompt = _build_morning_prompt(weather) if hour < 15 else _build_evening_prompt(weather)
    briefing = await _call_llm_direct(prompt)
    await update.message.reply_text(prepare_telegram_text("☀️ Брифинг Kolenke\n\n" + briefing)[:4000])


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.message.text:
        return

    user_id = update.effective_user.id
    _subscribers.add(user_id)  # Auto-subscribe on any message
    text = update.message.text.strip()
    if not text:
        return

    language = _detect_language(text)
    history = _get_history(user_id)
    history.append({"role": "user", "content": text})
    _trim_history(history)

    # Show "typing..." while we wait for the API
    await update.message.chat.send_action("typing")

    reply = await _call_llm(history, language)
    history.append({"role": "assistant", "content": reply})
    _trim_history(history)

    if len(reply) > 4000:
        for i in range(0, len(reply), 4000):
            await update.message.reply_text(prepare_telegram_text(reply[i:i + 4000])[:4000])
    else:
        await update.message.reply_text(prepare_telegram_text(reply)[:4000])


async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle voice messages: download → transcribe via STT → send to AlemLLM."""
    if not update.message or not update.message.voice:
        return

    user_id = update.effective_user.id
    await update.message.chat.send_action("typing")

    voice = update.message.voice
    tg_file = await context.bot.get_file(voice.file_id)
    audio_bytes = await tg_file.download_as_bytearray()

    transcribed = await _transcribe_audio(bytes(audio_bytes))

    if not transcribed:
        await update.message.reply_text("Couldn't understand the audio. Please try again or type your question.")
        return

    language = _detect_language(transcribed)
    history = _get_history(user_id)
    history.append({"role": "user", "content": transcribed})
    _trim_history(history)

    await update.message.chat.send_action("typing")

    reply = await _call_llm(history, language)
    history.append({"role": "assistant", "content": reply})
    _trim_history(history)

    if len(reply) > 4000:
        for i in range(0, len(reply), 4000):
            await update.message.reply_text(prepare_telegram_text(reply[i:i + 4000])[:4000])
    else:
        await update.message.reply_text(prepare_telegram_text(reply)[:4000])


# ─── Application singleton ─────────────────────────────────────────────

_application: Application | None = None


def get_application() -> Application | None:
    global _application
    if _application is not None:
        return _application

    if not telegram_settings.bot_token:
        logger.warning("TELEGRAM_BOT_TOKEN not set — Telegram bot disabled")
        return None

    _application = (
        Application.builder()
        .token(telegram_settings.bot_token)
        .build()
    )

    _application.add_handler(CommandHandler("start", cmd_start))
    _application.add_handler(CommandHandler("clear", cmd_clear))
    _application.add_handler(CommandHandler("subscribe", cmd_subscribe))
    _application.add_handler(CommandHandler("unsubscribe", cmd_unsubscribe))
    _application.add_handler(CommandHandler("briefing", cmd_briefing))
    _application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    _application.add_handler(MessageHandler(filters.VOICE, handle_voice))

    # Schedule daily briefings (times in UTC; Astana = UTC+5)
    # Morning: 7:00 Astana = 02:00 UTC
    # Evening: 20:00 Astana = 15:00 UTC
    job_queue = _application.job_queue
    if job_queue is None:
        print("[Briefing] WARNING: job_queue is None — APScheduler not installed?", flush=True)
    else:
        # Morning: 7:00 Astana = 02:00 UTC
        # Evening: 20:00 Astana = 15:00 UTC
        job_queue.run_daily(_morning_briefing, time=time(hour=2, minute=0))
        job_queue.run_daily(_evening_briefing, time=time(hour=15, minute=0))
        print("[Briefing] Scheduled: morning 07:00, evening 20:00 (Astana)", flush=True)

    return _application
