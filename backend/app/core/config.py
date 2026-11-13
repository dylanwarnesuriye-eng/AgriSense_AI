
import os

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_BACKEND_ENV = os.path.join(_BACKEND_DIR, ".env")


class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Agriculture AI"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    ALLOW_MOCK_TOKENS: bool = True
    ALLOW_IN_MEMORY_FALLBACK: bool = False

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in ("production", "prod")

    @property
    def is_testing(self) -> bool:
        return self.ENVIRONMENT.lower() in ("test", "testing") or self.ALLOW_IN_MEMORY_FALLBACK

    # CORS configuration
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        return []

    # Storage paths
    DATA_DIR: str = "./data"
    MODELS_DIR: str = "./models/saved"

    # Firebase Admin SDK Configuration
    FIREBASE_CREDENTIALS_PATH: str = ""
    FIREBASE_AUTH_EMULATOR_HOST: str = ""
    FIRESTORE_EMULATOR_HOST: str = ""

    model_config = SettingsConfigDict(
        env_file=(".env", _BACKEND_ENV),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
