from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class RedisSettings(BaseSettings):
    redis_url: str = Field(default="", alias="REDIS_URL")
    host: str = Field(default="", alias="REDIS_HOST")
    port: int = Field(default=0, alias="REDIS_PORT")
    username: str = Field(default="", alias="REDIS_USERNAME")
    password: str = Field(default="", alias="REDIS_PASSWORD")
    db: int = Field(default=0, alias="REDIS_DB")
    ssl: bool = Field(default=False, alias="REDIS_SSL")
    decode_responses: bool = True
    socket_connect_timeout: int = Field(default=5, alias="REDIS_SOCKET_CONNECT_TIMEOUT")
    socket_timeout: int = Field(default=5, alias="REDIS_SOCKET_TIMEOUT")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_connection_source(self) -> "RedisSettings":
        if self.redis_url:
            return self

        if not self.host or self.port <= 0:
            raise ValueError("Set REDIS_URL or both REDIS_HOST and REDIS_PORT")

        return self

    @property
    def connection_url(self) -> str:
        if self.redis_url:
            return self.redis_url

        scheme = "rediss" if self.ssl else "redis"

        if self.username and self.password:
            return f"{scheme}://{self.username}:{self.password}@{self.host}:{self.port}/{self.db}"

        if self.password:
            return f"{scheme}://:{self.password}@{self.host}:{self.port}/{self.db}"

        return f"{scheme}://{self.host}:{self.port}/{self.db}"


redis_settings = RedisSettings()
