from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

TelegramUpdateMode = Literal["off", "polling", "webhook"]


class TelegramBotSettings(BaseSettings):
    bot_token: str = Field(default="", alias="TELEGRAM_BOT_TOKEN")
    webhook_secret: str = Field(default="decentra-sun-advisor-webhook-secret", alias="TELEGRAM_WEBHOOK_SECRET")
    webhook_base_url: str = Field(default="", alias="TELEGRAM_WEBHOOK_URL")
    update_mode: TelegramUpdateMode = Field(default="off", alias="TELEGRAM_UPDATE_MODE")

    @field_validator("update_mode", mode="before")
    @classmethod
    def normalize_update_mode(cls, value: str) -> str:
        if value is None:
            return "off"

        mode = str(value).strip().lower()
        if mode not in {"off", "polling", "webhook"}:
            raise ValueError("TELEGRAM_UPDATE_MODE must be one of: off, polling, webhook")
        return mode

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


telegram_settings = TelegramBotSettings()
