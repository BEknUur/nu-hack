import json

from fastapi.routing import APIRouter
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
import httpx

from starlette.status import HTTP_200_OK, HTTP_500_INTERNAL_SERVER_ERROR

from pydantic import BaseModel, Field

from .schemas import ChatMessageRequest, ChatMessageResponse
from services.ragflow.config import ragflow_settings
from services.alemllm.config import alemllm_settings
from services.chat.prompts import build_system_prompt

ALEMLLM_API_URL = "https://llm.alem.ai/v1/chat/completions"

TIMEOUT = 60.0

router = APIRouter(prefix="/chat", tags=["chat"])


def _build_api_messages(request: ChatMessageRequest) -> list[dict]:
    context_dict = request.context.model_dump() if request.context else None
    system_prompt = build_system_prompt(context=context_dict, language=request.language)

    messages = [{"role": "system", "content": system_prompt}]
    for m in request.messages:
        messages.append({"role": m.role, "content": m.content})
    return messages


def _parse_suggestions(text: str) -> tuple[str, list[str]]:
    marker = "[SUGGESTIONS]"
    idx = text.find(marker)
    if idx == -1:
        return text.strip(), []

    clean_text = text[:idx].strip()
    suggestions_block = text[idx + len(marker):]

    suggestions = []
    for line in suggestions_block.strip().splitlines():
        line = line.strip()
        if line.startswith("- "):
            suggestions.append(line[2:].strip())
        elif line:
            suggestions.append(line)

    return clean_text, suggestions


def _ragflow_headers() -> dict:
    return {
        "Authorization": f"Bearer {ragflow_settings.api_key}",
        "Content-Type": "application/json",
    }


async def _collect_sse_content(response: httpx.Response) -> str:
    """RAGFlow always returns SSE even for non-stream requests. Collect all delta content."""
    full_content = []
    for line in response.text.splitlines():
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
    return "".join(full_content)


@router.post(
    "/message",
    response_model=ChatMessageResponse,
    status_code=HTTP_200_OK,
)
async def chat_message(request: ChatMessageRequest) -> ChatMessageResponse:
    messages = _build_api_messages(request)

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                ragflow_settings.chat_completions_url,
                headers=_ragflow_headers(),
                json={"model": "ragflow", "messages": messages},
            )

        if response.status_code != HTTP_200_OK:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text[:500],
            )

        content = await _collect_sse_content(response)

        if not content:
            raise HTTPException(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Empty response from RAGFlow",
            )

        clean_text, suggestions = _parse_suggestions(content)
        return ChatMessageResponse(response=clean_text, suggestions=suggestions)

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Request failed: {str(e)}",
        )


@router.post("/stream")
async def chat_stream(request: ChatMessageRequest) -> StreamingResponse:
    messages = _build_api_messages(request)

    async def event_generator():
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                async with client.stream(
                    "POST",
                    ragflow_settings.chat_completions_url,
                    headers=_ragflow_headers(),
                    json={"model": "ragflow", "messages": messages, "stream": True},
                ) as response:
                    if response.status_code != HTTP_200_OK:
                        error_body = await response.aread()
                        yield f"data: {{\"error\": \"{error_body.decode()}\"}}\n\n"
                        return

                    async for line in response.aiter_lines():
                        if line.startswith("data:"):
                            yield f"{line}\n\n"

        except httpx.RequestError as e:
            yield f"data: {{\"error\": \"Request failed: {str(e)}\"}}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ─── Building Analysis (AlemLLM direct) ─────────────────────────────

class BuildingAnalysisRequest(BaseModel):
    lat: float
    lng: float
    in_sun: bool | None = None
    best_side: str | None = None
    confidence: float | None = None
    sun_hours: float | None = None
    address: str | None = None
    complex_name: str | None = None
    language: str = "ru"


class BuildingAnalysisResponse(BaseModel):
    analysis: str


@router.post(
    "/analyze-building",
    response_model=BuildingAnalysisResponse,
    status_code=HTTP_200_OK,
)
async def analyze_building(req: BuildingAnalysisRequest) -> BuildingAnalysisResponse:
    sun_status = "—" if req.in_sun is None else ("на солнце" if req.in_sun else "в тени")
    conf_str = f" ({round(req.confidence * 100)}%)" if req.confidence else ""
    sun_hours_str = f"{req.sun_hours:.1f} ч" if req.sun_hours is not None else "—"

    prompt = f"""Ты Sun Advisor — эксперт по солнечному свету Астаны. Проанализируй здание:

Координаты: {req.lat:.5f}, {req.lng:.5f}
Статус: {sun_status}
Солнце за день в выбранной точке: {sun_hours_str}
Лучшая сторона (ML): {req.best_side or '—'}{conf_str}
{f'Адрес: {req.address}' if req.address else ''}
{f'ЖК: {req.complex_name}' if req.complex_name else ''}

Дай краткий анализ (150 слов макс):
1. Инсоляция — норма 2.5ч по СН РК 2.04-01-2011
2. Какие этажи лучше для солнца
3. Влияние на стоимость (южная сторона +5-15%)
4. Один совет покупателю

{'Отвечай на казахском.' if req.language == 'kk' else 'Answer in English.' if req.language == 'en' else 'Отвечай на русском.'}"""

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
                    "messages": [{"role": "user", "content": prompt}],
                },
            )

        if resp.status_code != HTTP_200_OK:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:300])

        data = resp.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return BuildingAnalysisResponse(analysis=content)

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM request failed: {str(e)}",
        )
