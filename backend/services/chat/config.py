from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class ChatSettings(BaseSettings):
    model_name: str = "qwen3"
    api_key: str = Field(..., alias="ALEM_QWEN3_API_KEY")
    api_url: str = "https://llm.alem.ai/v1/chat/completions"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


chat_settings = ChatSettings()
