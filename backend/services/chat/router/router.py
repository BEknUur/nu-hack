from fastapi.routing import APIRouter
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
import httpx

from starlette.status import HTTP_200_OK, HTTP_500_INTERNAL_SERVER_ERROR

from .schemas import ChatMessageRequest, ChatMessageResponse
from services.alemllm.config import alemllm_settings
from services.chat.prompts import build_system_prompt

ALEMLLM_API_URL = "https://llm.alem.ai/v1/chat/completions"

TIMEOUT = 60.0
TEMPERATURE = 0.4

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
                ALEMLLM_API_URL,
                headers={
                    "Authorization": f"Bearer {alemllm_settings.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": alemllm_settings.model_name,
                    "messages": messages,
                    "temperature": TEMPERATURE,
                },
            )

        if response.status_code != HTTP_200_OK:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text,
            )

        data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content")

        if not content:
            raise HTTPException(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Invalid response from LLM",
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
                    ALEMLLM_API_URL,
                    headers={
                        "Authorization": f"Bearer {alemllm_settings.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": alemllm_settings.model_name,
                        "messages": messages,
                        "temperature": TEMPERATURE,
                        "stream": True,
                    },
                ) as response:
                    if response.status_code != HTTP_200_OK:
                        error_body = await response.aread()
                        yield f"data: {{\"error\": \"{error_body.decode()}\"}}\n\n"
                        return

                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
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
