# Third-party modules
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class AlemLLMSettings(BaseSettings):

    """
    Settings for the AlemLLM API instance.
    """

    model_name: str = "alemllm"
    api_key: str = Field(..., alias="ALEM_LLM_API_KEY")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )



alemllm_settings = AlemLLMSettings()