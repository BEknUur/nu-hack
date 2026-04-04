"""
Telegram bot that wraps the existing DeCentra chat service.
Starts polling on FastAPI startup — sends user messages to Qwen3
and voice messages through Alem STT → Qwen3.
"""
from __future__ import annotations

import logging
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
from services.alemllm.config import alemllm_settings
from services.chat.prompts import build_system_prompt
from services.voice.config import voice_stt_settings

ALEMLLM_API_URL = "https://llm.alem.ai/v1/chat/completions"

logger = logging.getLogger(__name__)

TIMEOUT = httpx.Timeout(timeout=60.0, read=60.0)
TEMPERATURE = 0.4

# Per-user conversation history (in-memory, resets on restart — fine for hackathon)
_conversations: dict[int, list[dict[str, str]]] = {}
MAX_HISTORY = 20


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
    """Call AlemLLM API (~1s latency vs 25s for Qwen3)."""
    system_prompt = build_system_prompt(context=None, language=language)
    api_messages = [{"role": "system", "content": system_prompt}] + messages

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
                    "messages": api_messages,
                    "temperature": TEMPERATURE,
                },
            )
        if resp.status_code != 200:
            logger.error("Qwen API error %s: %s", resp.status_code, resp.text[:200])
            return "Sorry, the AI service is temporarily unavailable. Please try again."

        data = resp.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        clean_text, suggestions = _parse_suggestions(content)

        # Append suggestions as inline text for Telegram
        if suggestions:
            clean_text += "\n\n💡 " + " | ".join(suggestions)

        return clean_text or "I couldn't generate a response. Please try again."

    except Exception as e:
        logger.exception("Qwen call failed: %s", e)
        return "Sorry, something went wrong. Please try again."


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


# ─── Handlers ──────────────────────────────────────────────────────────

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    _conversations.pop(user_id, None)
    await update.message.reply_text(
        "☀️ *DeCentra Sun Advisor*\n\n"
        "I'm an AI expert on sunlight, shadows, and urban planning.\n\n"
        "Ask me anything about:\n"
        "• Shadow analysis for buildings\n"
        "• Optimal building orientation\n"
        "• Tree planting for shade\n"
        "• Worker heat safety\n"
        "• Solar panel placement\n\n"
        "Type your question or use /clear to reset the conversation.",
        parse_mode="Markdown",
    )


async def cmd_clear(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    _conversations.pop(user_id, None)
    await update.message.reply_text("🔄 Conversation cleared. Ask me anything!")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.message.text:
        return

    user_id = update.effective_user.id
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
            await update.message.reply_text(reply[i:i + 4000])
    else:
        await update.message.reply_text(reply)


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
            await update.message.reply_text(reply[i:i + 4000])
    else:
        await update.message.reply_text(reply)


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
    _application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    _application.add_handler(MessageHandler(filters.VOICE, handle_voice))

    return _application
