# Third-party modules
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class AlemPostgresSettings(BaseSettings):

    """
    Settings for the Alem Postgres database instance. 
    """

    host: str = Field(..., alias="ALEM_POSTGRES_HOST")
    port: int = Field(..., alias="ALEM_POSTGRES_PORT")
    user: str = Field(..., alias="ALEM_POSTGRES_USER")
    password: str = Field(..., alias="ALEM_POSTGRES_PASSWORD")
    dbname: str = Field(..., alias="ALEM_POSTGRES_DB")

    debug: bool = Field(default=False, alias="ALEM_POSTGRES_DEBUG")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def url(self) -> str:
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.dbname}"


alemdb_settings = AlemPostgresSettings()