# Third-party modules
from fastapi.routing import APIRouter
from fastapi import HTTPException
import httpx

from starlette.status import HTTP_200_OK, HTTP_500_INTERNAL_SERVER_ERROR

# Project modules
from .schemas import ChatRequest, ChatResponse
from services.alemllm.config import alemllm_settings

TIME_OUT_TIME = 30.0

router = APIRouter(prefix="/alemllm", tags=["alemllm"])

@router.post(
    "/chat",
    response_model=ChatResponse,
    status_code=HTTP_200_OK,
)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Handle chat requests to the AlemLLM API
    """
    try:
        async with httpx.AsyncClient(timeout=TIME_OUT_TIME) as client:
            response = await client.post(
                "https://llm.alem.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {alemllm_settings.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": alemllm_settings.model_name,
                    "messages": [m.model_dump() for m in request.messages],
                    "temperature": request.temperature,
                    "max_tokens": request.max_tokens,
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
                detail="Invalid response from AlemLLM",
            )

        return ChatResponse(response=content)

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Request failed: {str(e)}",
        )
    