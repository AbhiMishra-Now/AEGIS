"""In-process state for the FastAPI app.

This is a single source of truth shared between the REST routers and the
Worker Agent. In production you would back this with Cloud SQL / Firestore
and a cache (Redis). The interface here is async-safe via asyncio.Lock.

On startup we hydrate from /backend/state.json if it exists; on every
write we persist a snapshot back. This survives process restarts for the
hackathon demo; in production you'd use a real DB.
"""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from .schemas import (
    Agent,
    AgentStatus,
    ApiKeyMeta,
    BehavioralSettings,
    HealEvent,
    Trace,
)

log = logging.getLogger("aegis.state")
STATE_FILE = Path(__file__).resolve().parent / "state.json"


class State:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._agents: Dict[str, Agent] = {}
        self._spans: List[Trace] = []
        self._heals: List[HealEvent] = []
        self._settings: BehavioralSettings = BehavioralSettings(
            loopToolThreshold=3,
            loopWindowSeconds=10,
            autoHealEnabled=True,
            liveStreamEnabled=True,
            costSpikeThreshold=0.5,
            tokenBudgetPerHour=200_000,
            judgeModel="gemini-2.5-pro",
            defaultProject="arize-hack-2024",
        )
        self._integrations: List[ApiKeyMeta] = []
        self._mcp_connected: bool = False
        self._last_heal_at: Optional[datetime] = None
        self._hydrate()
        if not self._agents:
            self._seed()

    # ------------------------------------------------------------------ seed
    def _seed(self) -> None:
        """Bootstrap with a representative agent roster for the demo."""
        self._agents = {
            "research-agent": Agent(
                id="research-agent",
                name="research-agent",
                model="gemini-2.5-pro",
                region="us-central1",
                status="warning",
                totalSpans=18_420,
                errorRate=0.034,
                lastSeen=datetime.utcnow(),
                owner="platform-eng",
                project="arize-hack-2024",
                location="us-central1",
            ),
            "support-bot": Agent(
                id="support-bot",
                name="support-bot",
                model="gemini-2.0-flash",
                region="us-east1",
                status="healthy",
                totalSpans=9_204,
                errorRate=0.008,
                lastSeen=datetime.utcnow(),
                owner="support-eng",
                project="arize-hack-2024",
                location="us-east1",
            ),
            "data-pipeline": Agent(
                id="data-pipeline",
                name="data-pipeline",
                model="gemini-2.5-pro",
                region="europe-west4",
                status="healing",
                totalSpans=4_080,
                errorRate=0.012,
                lastSeen=datetime.utcnow(),
                owner="data-eng",
                project="arize-hack-2024",
                location="europe-west4",
            ),
        }
        self._integrations = [
            ApiKeyMeta(
                provider="arize",
                label="Arize Phoenix MCP",
                maskedKey="arize_phx_••••••••••3a91",
                lastRotatedAt=datetime.utcnow(),
                envVar="ARIZE_API_KEY",
            ),
            ApiKeyMeta(
                provider="phoenix",
                label="Phoenix Trace Store",
                maskedKey="phx_••••••••••7b2c",
                lastRotatedAt=datetime.utcnow(),
                envVar="PHOENIX_URL",
            ),
            ApiKeyMeta(
                provider="gcp_vertex",
                label="Google Cloud Vertex AI",
                maskedKey="ya29.••••••••••bT2k",
                lastRotatedAt=datetime.utcnow(),
                envVar="GCP_SERVICE_ACCOUNT_JSON_PATH",
            ),
            ApiKeyMeta(
                provider="gemini_judge",
                label="Gemini Trace Judge",
                maskedKey="AIzaSy••••••••••Qkz",
                lastRotatedAt=datetime.utcnow(),
                envVar="GEMINI_API_KEY",
            ),
        ]
        self._persist()

    # ---------------------------------------------------------------- hydrate
    def _hydrate(self) -> None:
        if not STATE_FILE.exists():
            return
        try:
            raw = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except Exception:
            log.exception("Failed to read state.json — starting fresh.")
            return
        try:
            if "agents" in raw:
                self._agents = {a["id"]: Agent(**a) for a in raw["agents"]}
            if "heals" in raw:
                self._heals = [HealEvent(**h) for h in raw["heals"]]
            if "settings" in raw:
                self._settings = BehavioralSettings(**raw["settings"])
            if "integrations" in raw:
                self._integrations = [ApiKeyMeta(**k) for k in raw["integrations"]]
            if "last_heal_at" in raw and raw["last_heal_at"]:
                self._last_heal_at = datetime.fromisoformat(raw["last_heal_at"])
        except Exception:
            log.exception("Failed to parse state.json — starting fresh.")

    def _persist(self) -> None:
        """Write a snapshot of the persistent bits to disk."""
        try:
            payload = {
                "agents": [a.model_dump(by_alias=True) for a in self._agents.values()],
                "heals": [h.model_dump(by_alias=True) for h in self._heals[:100]],
                "settings": self._settings.model_dump(by_alias=True),
                "integrations": [k.model_dump(by_alias=True) for k in self._integrations],
                "last_heal_at": self._last_heal_at.isoformat() if self._last_heal_at else None,
            }
            STATE_FILE.write_text(json.dumps(payload, default=str, indent=2), encoding="utf-8")
        except Exception:
            log.exception("Failed to persist state.json")

    # ---------------------------------------------------------------- agents
    async def list_agents(self) -> List[Agent]:
        async with self._lock:
            return [a.model_copy(deep=True) for a in self._agents.values()]

    async def get_agent(self, agent_id: str) -> Optional[Agent]:
        async with self._lock:
            a = self._agents.get(agent_id)
            return a.model_copy(deep=True) if a else None

    async def set_agent_status(self, agent_id: str, status: AgentStatus) -> Optional[Agent]:
        async with self._lock:
            a = self._agents.get(agent_id)
            if not a:
                return None
            a.status = status
            a.lastSeen = datetime.utcnow()
            self._persist()
            return a.model_copy(deep=True)

    async def register_agent(self, agent: Agent) -> Agent:
        async with self._lock:
            self._agents[agent.id] = agent
            self._persist()
            return agent.model_copy(deep=True)

    # ----------------------------------------------------------------- spans
    async def push_span(self, span: Trace) -> None:
        async with self._lock:
            self._spans.insert(0, span)
            del self._spans[1000:]

    async def list_spans(self, limit: int = 100) -> List[Trace]:
        async with self._lock:
            return [s.model_copy(deep=True) for s in self._spans[:limit]]

    # ----------------------------------------------------------------- heals
    async def push_heal(self, h: HealEvent) -> None:
        async with self._lock:
            self._heals.insert(0, h)
            del self._heals[1000:]
            self._last_heal_at = h.ts
            self._persist()

    async def list_heals(self, limit: int = 100) -> List[HealEvent]:
        async with self._lock:
            return [h.model_copy(deep=True) for h in self._heals[:limit]]

    async def get_heal(self, heal_id: str) -> Optional[HealEvent]:
        async with self._lock:
            for h in self._heals:
                if h.id == heal_id:
                    return h.model_copy(deep=True)
            return None

    # ------------------------------------------------------------- settings
    async def get_settings(self) -> BehavioralSettings:
        async with self._lock:
            return self._settings.model_copy(deep=True)

    async def set_settings(self, s: BehavioralSettings) -> BehavioralSettings:
        async with self._lock:
            self._settings = s.model_copy(deep=True)
            self._persist()
            return self._settings

    # ---------------------------------------------------------- integrations
    async def list_integrations(self) -> List[ApiKeyMeta]:
        async with self._lock:
            return [k.model_copy(deep=True) for k in self._integrations]

    async def mark_key_rotated(self, provider: str) -> Optional[ApiKeyMeta]:
        async with self._lock:
            for k in self._integrations:
                if k.provider == provider:
                    k.lastRotatedAt = datetime.utcnow()
                    self._persist()
                    return k.model_copy(deep=True)
            return None

    # ----------------------------------------------------- connection state
    async def set_mcp_connected(self, value: bool) -> None:
        async with self._lock:
            self._mcp_connected = value

    async def is_mcp_connected(self) -> bool:
        async with self._lock:
            return self._mcp_connected

    async def snapshot_health(self) -> dict:
        async with self._lock:
            return {
                "mcp_connected": self._mcp_connected,
                "active_agents": len(self._agents),
                "last_heal_at": self._last_heal_at,
            }


# Singleton. Imported by routers and the worker agent.
state = State()
