from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

_DEV_JWT_SECRET_KEY = "dev-only-insecure-secret-do-not-use-in-production"


class Settings(BaseSettings):
    """Application configuration, sourced from environment variables / .env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "MediQ"
    environment: str = "development"
    database_url: str = "sqlite:///./mediq.db"
    cors_origins: str = "http://localhost:5173"

    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    def model_post_init(self, __context: object) -> None:
        if self.jwt_secret_key:
            return
        if self.environment == "development":
            self.jwt_secret_key = _DEV_JWT_SECRET_KEY
        else:
            raise RuntimeError(
                "JWT_SECRET_KEY must be set (via environment variable or .env) when "
                f"ENVIRONMENT is {self.environment!r}. Only 'development' falls back "
                "to an insecure default."
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
