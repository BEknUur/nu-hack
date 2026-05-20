from fastapi.routing import APIRouter
from fastapi import HTTPException, UploadFile, File, Form
import httpx

from starlette.status import HTTP_200_OK, HTTP_500_INTERNAL_SERVER_ERROR

from .schemas import TranscribeResponse
from services.voice.config import voice_stt_settings

TIMEOUT = 30.0

router = APIRouter(prefix="/voice", tags=["voice"])


@router.post(
    "/transcribe",
    response_model=TranscribeResponse,
    status_code=HTTP_200_OK,
)
async def transcribe(
    audio: UploadFile = File(...),
    language: str = Form("kz"),
) -> TranscribeResponse:
    if not voice_stt_settings.api_key:
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail="STT API key is not configured. Set ALEM_STT_KZ_API_KEY in your .env file.",
        )

    try:
        audio_bytes = await audio.read()
        filename = audio.filename or "audio.wav"
        content_type = audio.content_type or "audio/wav"

        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                voice_stt_settings.api_url,
                headers={
                    "Authorization": f"Bearer {voice_stt_settings.api_key}",
                },
                files={
                    "file": (filename, audio_bytes, content_type),
                },
                data={
                    "model": voice_stt_settings.model_name,
                },
            )

        if response.status_code != HTTP_200_OK:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text,
            )

        data = response.json()
        text = data.get("text", "")

        if not text:
            raise HTTPException(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Empty transcription returned from STT API.",
            )

        return TranscribeResponse(text=text, language=language)

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Request failed: {str(e)}",
        )
