"""Devora Backend — Configuration"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:3000"
    dev_mode: bool = True

    # Firebase
    firebase_project_id: str = ""
    firebase_service_account_path: str = ""

    # Gemini
    gemini_api_key: str = ""

    # Workspaces
    workspaces_dir: str = "workspaces"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()

