from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    anthropic_api_key: str = "set-in-env"
    claude_model: str = "claude-sonnet-4-6"
    max_tokens: int = 2048
    timeout_seconds: int = 30
    cors_origins: list[str] = ["http://localhost:4200", "http://localhost:8080"]

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
