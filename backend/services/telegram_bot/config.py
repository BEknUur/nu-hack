from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class TelegramBotSettings(BaseSettings):
    bot_token: str = Field(default="", alias="TELEGRAM_BOT_TOKEN")
    webhook_secret: str = Field(default="decentra-sun-advisor-webhook-secret", alias="TELEGRAM_WEBHOOK_SECRET")
    webhook_base_url: str = Field(default="", alias="TELEGRAM_WEBHOOK_URL")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


telegram_settings = TelegramBotSettings()
