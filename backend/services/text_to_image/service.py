import logging

import httpx
from fastapi import HTTPException

from services.text_to_image.config import text_to_image_settings
from services.text_to_image.router.schemas import GeneratedImage

logger = logging.getLogger(__name__)

TIMEOUT = httpx.Timeout(timeout=90.0, read=90.0)


async def generate_image(
    prompt: str,
    size: str | None = None,
) -> tuple[list[GeneratedImage], str]:
    payload = {
        "model": text_to_image_settings.model,
        "prompt": prompt,
        "size": size or text_to_image_settings.default_size,
    }

    logger.info("Text-to-image request: size=%s", payload["size"])

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.post(
                text_to_image_settings.api_url,
                headers={
                    "Authorization": f"Bearer {text_to_image_settings.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Image generation timed out.")
    except httpx.RequestError as e:
        logger.error("Text-to-image request error: %s", e)
        raise HTTPException(status_code=502, detail="Image generation service unreachable.")

    if resp.status_code != 200:
        logger.error("Text-to-image API error %s: %s", resp.status_code, resp.text[:300])
        raise HTTPException(status_code=502, detail=f"API returned {resp.status_code}.")

    data = resp.json()
    images = [
        GeneratedImage(url=item.get("url"), b64_json=item.get("b64_json"))
        for item in data.get("data", [])
    ]

    if not images:
        raise HTTPException(status_code=502, detail="API returned no images.")

    return images, prompt
