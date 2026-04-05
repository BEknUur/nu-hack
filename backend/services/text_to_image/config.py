from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class TextToImageSettings(BaseSettings):
    api_key: str = Field(..., alias="TEXT_TO_IMAGE_API_KEY")
    api_url: str = Field("https://llm.alem.ai/v1/images/generations", alias="TEXT_TO_IMAGE_API_URL")
    model: str = "text-to-image"
    default_size: str = "1024x1024"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


text_to_image_settings = TextToImageSettings()
