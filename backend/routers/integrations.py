"""/api/integrations — masked key metadata + rotate action + webhooks.

SECURITY MODEL (NON-NEGOTIABLE)
  - GET  /api/integrations returns ONLY masked key metadata. The
    plaintext key is NEVER included in the response.
  - POST /api/integrations/:provider/rotate:
      1. Mints a new key server-side.
      2. Writes the new value to /backend/.env on disk.
      3. Logs the new value ONCE to the server stdout.
      4. Returns ONLY the new masked meta to the frontend.
  - POST /api/integrations/webhook/arize accepts events from the
    Arize MCP server (span.finished, etc.) and pushes them into the
    realtime stream. No secrets are accepted in the body.
"""
from __future__ import annotations

import logging
import os
import secrets
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from ..schemas import ApiKeyMeta, RotateKeyResponse
from ..state import state
from ..wa.broadcaster import broadcast

log = logging.getLogger("aegis.integrations")
router = APIRouter()

# Map provider -> env-var name. The frontend NEVER sees these names with
# the values attached; they are only used to locate which file line to
# rewrite on rotation.
PROVIDER_TO_ENV: Dict[str, str] = {
    "arize": "ARIZE_API_KEY",
    "phoenix": "PHOENIX_URL",
    "gcp_vertex": "GCP_SERVICE_ACCOUNT_JSON_PATH",
    "gemini_judge": "GEMINI_API_KEY",
}


# =============================================================================
# Webhook payloads (Arize → AEGIS)
# =============================================================================
class ArizeWebhookEvent(BaseModel):
    """Arize sends these to our webhook on each span completion.

    We accept a minimal shape and normalize in the handler. No secrets.
    """
    event: Literal["span.finished", "loop.detected", "alert.fired"]
    project: Optional[str] = None
    agent: Optional[str] = None
    span_id: Optional[str] = Field(None, alias="spanId")
    trace_id: Optional[str] = Field(None, alias="traceId")
    tool: Optional[str] = None
    tokens: Optional[int] = None
    cost: Optional[float] = None
    latency_ms: Optional[int] = Field(None, alias="latencyMs")
    summary: Optional[str] = None
    extra: Dict[str, Any] = Field(default_factory=dict, alias="extra")


# =============================================================================
# Helpers
# =============================================================================
def _mint_new_key(provider: str) -> str:
    """Generate a fresh secret value for the given provider."""
    if provider == "arize":
        return "arize_phx_" + secrets.token_urlsafe(20)
    if provider == "phoenix":
        return "https://phoenix-" + secrets.token_hex(4) + ".arize.com"
    if provider == "gcp_vertex":
        return "/etc/aegis/sa-" + secrets.token_hex(4) + ".json"
    if provider == "gemini_judge":
        return "AIzaSy" + secrets.token_urlsafe(20)
    raise HTTPException(status_code=404, detail="unknown provider")


def _write_env(env_var: str, value: str) -> None:
    """Append or update KEY=VALUE in /backend/.env."""
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        env_path.write_text(f"{env_var}={value}\n", encoding="utf-8")
        return
    lines = env_path.read_text(encoding="utf-8").splitlines()
    found = False
    for i, line in enumerate(lines):
        if line.startswith(f"{env_var}="):
            lines[i] = f"{env_var}={value}"
            found = True
            break
    if not found:
        lines.append(f"{env_var}={value}")
    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _mask_key(value: str) -> str:
    """Produce the masked representation shown in the UI."""
    if len(value) <= 8:
        return "•" * len(value)
    return value[:4] + "•" * 8 + value[-4:]


# =============================================================================
# Routes
# =============================================================================
@router.get("", response_model=List[ApiKeyMeta])
async def list_integrations() -> List[ApiKeyMeta]:
    return await state.list_integrations()


@router.post("/{provider}/rotate", response_model=RotateKeyResponse)
async def rotate(provider: str) -> RotateKeyResponse:
    if provider not in PROVIDER_TO_ENV:
        raise HTTPException(status_code=404, detail="unknown provider")
    new_value = _mint_new_key(provider)
    _write_env(PROVIDER_TO_ENV[provider], new_value)
    # CRITICAL: we log the plaintext key to the SERVER console once, so an
    # operator can capture it. We NEVER include it in the HTTP response.
    log.warning("ROTATED %s -> %s (capture from this log)", provider, new_value)
    meta = await state.mark_key_rotated(provider)
    if not meta:
        raise HTTPException(status_code=404, detail="integration not found")
    return RotateKeyResponse(
        ok=True,
        meta=meta,
        serverLogHint=(
            "The new key was printed once to the AEGIS server stdout and "
            "written to /backend/.env. It will NOT be sent to the browser."
        ),
    )


@router.post("/webhook/arize")
async def arize_webhook(event: ArizeWebhookEvent) -> Dict[str, Any]:
    """Receive an event from the Arize MCP server.

    We DO NOT trust the body for secrets. We re-emit the event onto the
    WebSocket so the dashboard can react in real time.
    """
    payload = event.model_dump(by_alias=True)
    log.info("Arize webhook: %s", event.event)
    await broadcast({"type": "arize_webhook", "data": payload})
    return {"ok": True}
