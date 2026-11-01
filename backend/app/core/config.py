"""Devora Backend — Configuration"""

from typing import Optional

try:
    from pydantic_settings import BaseSettings
except ImportError:
    class BaseSettings:  # type: ignore[no-redef]
        pass


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API & Runtime
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:3000,https://*.vercel.app"
    dev_mode: bool = True
    devora_free_tier: bool = True

    # Firebase (Spark Free Tier compatible)
    firebase_project_id: str = "rapid-shift-r8chg"
    firebase_database_id: str = "ai-studio-1c7f4661-dbcb-4537-bd88-5e63b84c93f3"
    firebase_service_account_path: str = ""
    firebase_service_account_json: str = ""

    # Gemini (Free Tier AI Studio API Key compatible)
    gemini_api_key: str = ""

    # Workspaces & Execution (Render Free-Tier /tmp compatible)
    workspaces_dir: str = "/tmp/devora/workspaces"
    checkpoint_db_path: str = "/tmp/devora/checkpoints/agent.db"
    workspace_port_start: int = 4100
    workspace_port_end: int = 4999
    command_timeout_seconds: int = 60

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()


