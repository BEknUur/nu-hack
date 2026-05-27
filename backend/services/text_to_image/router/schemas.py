from pydantic import BaseModel, Field


class ImageGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=500)
    size: str = Field("512x512", pattern=r"^\d+x\d+$")


class GeneratedImage(BaseModel):
    url: str | None = None
    b64_json: str | None = None


class ImageGenerateResponse(BaseModel):
    images: list[GeneratedImage]
    prompt_used: str
