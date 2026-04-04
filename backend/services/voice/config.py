from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class VoiceSTTSettings(BaseSettings):
    model_name: str = "speech-to-text-kk"
    api_key: str = Field(default="", alias="ALEM_STT_KZ_API_KEY")
    api_url: str = Field(
        default="https://llm.alem.ai/v1/audio/transcriptions",
        alias="ALEM_STT_KZ_URL",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


voice_stt_settings = VoiceSTTSettings()
