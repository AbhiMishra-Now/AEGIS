"""Centralized configuration.

ALL secrets are read from environment variables (typically loaded from
/backend/.env). They are never logged and never sent to the frontend.

The env-var names here match /backend/.env.example. The frontend never
imports this module and never sees any of its values.
"""
from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    """Runtime configuration sourced exclusively from /backend/.env."""

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- Server ------------------------------------------------------------
    host: str = Field("0.0.0.0", alias="HOST")
    port: int = Field(8000, alias="PORT")
    log_level: str = Field("INFO", alias="LOG_LEVEL")

    # ---- Frontend trust list (CORS) ----------------------------------------
    cors_origins: List[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:5173"],
        alias="CORS_ORIGINS",
    )

    # ---- Arize Phoenix ----------------------------------------------------
    arize_api_key: str | None = Field(None, alias="ARIZE_API_KEY")
    phoenix_api_key: str | None = Field(None, alias="PHOENIX_API_KEY")
    phoenix_url: str = Field("https://app.phoenix.arize.com", alias="PHOENIX_URL")
    phoenix_project: str = Field("aegis-prod", alias="PHOENIX_PROJECT")
    phoenix_mcp_url: str = Field("", alias="PHOENIX_MCP_URL")
    phoenix_mcp_enabled: bool = Field(True, alias="PHOENIX_MCP_ENABLED")

    @property
    def effective_api_key(self) -> str:
        """Return PHOENIX_API_KEY if present, otherwise fallback to ARIZE_API_KEY."""
        return self.phoenix_api_key or self.arize_api_key or ""


    # ---- Google Cloud Vertex AI -------------------------------------------
    gcp_project_id: str = Field(..., alias="GCP_PROJECT_ID")
    gcp_location: str = Field("us-central1", alias="GCP_LOCATION")
    agent_id: str = Field("research-agent", alias="AGENT_ID")
    gcp_service_account_json_path: str = Field(
        "/etc/aegis/sa.json", alias="GCP_SERVICE_ACCOUNT_JSON_PATH"
    )

    # ---- Gemini judge ------------------------------------------------------
    gemini_api_key: str = Field(..., alias="GEMINI_API_KEY")
    judge_model: str = Field("gemini-2.5-pro", alias="JUDGE_MODEL")

    # ---- Behavioral defaults ----------------------------------------------
    loop_tool_threshold: int = Field(3, alias="LOOP_TOOL_THRESHOLD")
    loop_window_seconds: int = Field(10, alias="LOOP_WINDOW_SECONDS")
    cost_spike_threshold: float = Field(0.5, alias="COST_SPIKE_THRESHOLD")
    token_budget_per_hour: int = Field(200_000, alias="TOKEN_BUDGET_PER_HOUR")
    auto_heal_enabled: bool = Field(True, alias="AUTO_HEAL_ENABLED")
    live_stream_enabled: bool = Field(True, alias="LIVE_STREAM_ENABLED")

    # ---- Worker ------------------------------------------------------------
    worker_poll_interval: int = Field(5, alias="WORKER_POLL_INTERVAL")
    worker_poll_limit: int = Field(200, alias="WORKER_POLL_LIMIT")

    @property
    def effective_phoenix_mcp_url(self) -> str:
        """If PHOENIX_MCP_URL is blank, derive it from PHOENIX_URL."""
        if self.phoenix_mcp_url:
            return self.phoenix_mcp_url
        # Phoenix's MCP endpoint typically lives at /api/mcp on the same host.
        return self.phoenix_url.rstrip("/") + "/api/mcp"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()  # type: ignore[call-arg]


# Convenience alias for imports elsewhere.
settings = get_settings()
