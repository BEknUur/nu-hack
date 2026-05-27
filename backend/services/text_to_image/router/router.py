from fastapi import APIRouter
from services.text_to_image.router.schemas import ImageGenerateRequest, ImageGenerateResponse
from services.text_to_image.service import generate_image

router = APIRouter(prefix="/ml/text-to-image", tags=["text-to-image"])


@router.post("/generate", response_model=ImageGenerateResponse)
async def generate(body: ImageGenerateRequest) -> ImageGenerateResponse:
    images, prompt_used = await generate_image(prompt=body.prompt, size=body.size)
    return ImageGenerateResponse(images=images, prompt_used=prompt_used)
