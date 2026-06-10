"""Pydantic models for the public API surface.

Every model below is what the frontend sees. SECURITY rules:
  - ApiKeyMeta.masked_key is always masked. The real key never leaves the
    backend.
  - BehavioralSettings is the only knob the frontend can write; the
    backend stores it in memory and persists to /backend/state.json.
  - LoopDetection, Trace, HealEvent mirror the Phoenix span shape so the
    frontend can render them without transformation.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


# ============================== Agents ======================================
AgentStatus = Literal["healthy", "warning", "healing", "paused"]


class Agent(BaseModel):
    id: str
    name: str
    model: str
    region: str
    status: AgentStatus
    total_spans: int = Field(..., alias="totalSpans")
    error_rate: float = Field(..., alias="errorRate")
    last_seen: datetime = Field(..., alias="lastSeen")
    owner: str
    project: str = Field(default="", alias="project")
    location: str = Field(default="", alias="location")


class AgentToggleResponse(BaseModel):
    ok: bool
    agent: Agent


# ============================== Traces =====================================
SpanStatus = Literal["success", "warning", "error", "healing"]


class Trace(BaseModel):
    """A single span as it appears in the dashboard.

    Mirrors the OpenInference span shape, normalized by the MCP worker.
    """
    id: str
    ts: datetime
    agent: str
    model: str
    tool: Optional[str] = None
    status: SpanStatus
    tokens: int
    cost: float
    latency_ms: int = Field(..., alias="latencyMs")
    summary: str
    trace_id: str = Field(..., alias="traceId")
    span_id: str = Field(..., alias="spanId")
    attributes: Dict[str, Any] = Field(default_factory=dict)


# ============================== Loop detection ==============================
class LoopDetection(BaseModel):
    """Result of the heuristic + Gemini judge pipeline."""
    id: str
    ts: datetime
    agent: str
    tool: Optional[str]
    loop_detected: bool = Field(..., alias="loopDetected")
    severity: Literal["low", "medium", "high", "critical"]
    reason: str
    evidence_span_ids: List[str] = Field(..., alias="evidenceSpanIds")
    judge_confidence: float = Field(..., alias="judgeConfidence")
    auto_healed: bool = Field(..., alias="autoHealed")


# ============================== Heals ======================================
class HealEvent(BaseModel):
    id: str
    ts: datetime
    agent: str
    reason: str
    loop_count: int = Field(..., alias="loopCount")
    wasted_tokens: int = Field(..., alias="wastedTokens")
    wasted_usd: float = Field(..., alias="wastedUsd")
    before_prompt: str = Field(..., alias="beforePrompt")
    after_prompt: str = Field(..., alias="afterPrompt")
    judge_verdict_id: Optional[str] = Field(None, alias="judgeVerdictId")
    triggered_by: Literal["auto", "manual"] = Field(..., alias="triggeredBy")


# ============================== Settings ===================================
class BehavioralSettings(BaseModel):
    loop_tool_threshold: int = Field(..., alias="loopToolThreshold", ge=2, le=50)
    loop_window_seconds: int = Field(..., alias="loopWindowSeconds", ge=1, le=600)
    auto_heal_enabled: bool = Field(..., alias="autoHealEnabled")
    live_stream_enabled: bool = Field(..., alias="liveStreamEnabled")
    cost_spike_threshold: float = Field(..., alias="costSpikeThreshold", ge=0)
    token_budget_per_hour: int = Field(..., alias="tokenBudgetPerHour", ge=0)
    judge_model: str = Field(..., alias="judgeModel")
    default_project: str = Field(..., alias="defaultProject")


# ============================== Integrations ===============================
class ApiKeyMeta(BaseModel):
    """The ONLY way the backend describes a key to the frontend.

    SECURITY:
      - masked_key is always masked, e.g. "arize_phx_••••••3a91".
      - env_var is the name of the env-var the backend reads at startup.
      - The plaintext key is NEVER included in any response.
    """
    provider: str
    label: str
    masked_key: str = Field(..., alias="maskedKey")
    last_rotated_at: Optional[datetime] = Field(None, alias="lastRotatedAt")
    env_var: str = Field(..., alias="envVar")


class RotateKeyResponse(BaseModel):
    ok: bool
    meta: ApiKeyMeta
    server_log_hint: str = Field(
        ...,
        alias="serverLogHint",
        description="Hint for the operator about where to find the new key.",
    )


# ============================== Health ======================================
class HealthResponse(BaseModel):
    status: Literal["ok", "degraded", "down"]
    service: str
    version: str
    mcp_connected: bool = Field(..., alias="mcpConnected")
    vertex_configured: bool = Field(..., alias="vertexConfigured")
    active_agents: int = Field(..., alias="activeAgents")
    last_heal_at: Optional[datetime] = Field(None, alias="lastHealAt")


# ============================== WebSocket envelope =========================
class WSMessage(BaseModel):
    type: Literal["hello", "span", "heal", "loop_detected", "settings_updated", "error"]
    data: Dict[str, Any] = Field(default_factory=dict)
