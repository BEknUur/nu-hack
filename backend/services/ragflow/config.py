from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class RAGFlowSettings(BaseSettings):
    api_key: str = Field(..., alias="RAGFLOW_API_KEY")
    chat_id: str = Field(default="302221ee306c11f18e651660efacdd58", alias="RAGFLOW_CHAT_ID")
    base_url: str = "https://a1-ragflow1.alem.ai"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def chat_completions_url(self) -> str:
        return f"{self.base_url}/api/v1/chats_openai/{self.chat_id}/chat/completions"


ragflow_settings = RAGFlowSettings()
