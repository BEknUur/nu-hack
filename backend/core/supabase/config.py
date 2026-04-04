# Third-party modules
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class SupabaseSettings(BaseSettings):
    """
    Settings for the self-hosted Supabase instance.
    """

    url: str = Field(..., alias="SUPABASE_URL")
    anon_key: str = Field(..., alias="SUPABASE_ANON_KEY")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


supabase_settings = SupabaseSettings()
