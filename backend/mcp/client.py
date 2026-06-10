"""Arize Phoenix MCP client + heuristic loop detector.

The MCP client polls the Phoenix REST API for new spans in the configured
project. (The official @arizeai/phoenix-mcp server ships with a Python
client wrapper, but for full control over backoff and batching we use
the REST API directly — both code paths end up at the same backend.)

PHOENIX REST ENDPOINTS USED
---------------------------
  GET /v1/projects/{project}/spans?start_time=...&limit=...
      Returns spans as JSON, newest first.

AUTHENTICATION
--------------
  Header:  api_key: <ARIZE_API_KEY>

NORMALIZATION
-------------
Phoenix spans are OpenInference-shaped. We normalize to the dashboard's
`Trace` schema. Anything we can't map becomes an `attributes` blob.
"""
from __future__ import annotations

import asyncio
import logging
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Awaitable, Callable, Deque, Dict, List, Optional, Tuple

import httpx

from ..config import settings
from ..schemas import Trace, SpanStatus

log = logging.getLogger("aegis.phoenix")


# =============================================================================
# Span event (internal type used by the worker pipeline)
# =============================================================================
@dataclass
class SpanEvent:
    id: str
    trace_id: str
    span_id: str
    agent: str
    model: str
    tool: Optional[str]
    tokens: int
    cost: float
    latency_ms: int
    ts: datetime
    raw: Dict


SpanCallback = Callable[[SpanEvent], Awaitable[None]]


# =============================================================================
# Loop detector (heuristic)
# =============================================================================
class LoopDetector:
    """Sliding-window detector.

    A "loop" is the same (agent, tool) pair called N or more times within
    a sliding window of W seconds. The thresholds come from settings (or
    the user's behavioral /api/settings).

    State is intentionally per-process; the worker is a singleton.
    """

    def __init__(self) -> None:
        # key: (agent, tool) -> deque of timestamps
        self._buckets: Dict[Tuple[str, Optional[str]], Deque[datetime]] = defaultdict(deque)

    def feed(self, ev: SpanEvent, threshold: int, window_sec: int) -> bool:
        """Returns True if this span completes a loop pattern."""
        if not ev.tool:
            return False
        key = (ev.agent, ev.tool)
        bucket = self._buckets[key]
        bucket.append(ev.ts)
        cutoff = ev.ts - timedelta(seconds=window_sec)
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        return len(bucket) >= threshold

    def evidence(self, ev: SpanEvent, window_sec: int) -> List[str]:
        """Return the span ids in the current bucket for evidence."""
        if not ev.tool:
            return []
        bucket = self._buckets[(ev.agent, ev.tool)]
        cutoff = ev.ts - timedelta(seconds=window_sec)
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        # We don't store span ids in the bucket; we store timestamps. For
        # evidence we return timestamps as ISO strings — the dashboard
        # correlates via the live stream.
        return [b.isoformat() for b in bucket]


# =============================================================================
# Phoenix MCP client (HTTP poller)
# =============================================================================
class PhoenixMCPClient:
    """Polls the Phoenix REST API for new spans and dispatches them.

    Lifecycle:
        client = PhoenixMCPClient()
        client.on_span(callback)
        await client.start()
        ...
        await client.stop()

    The client uses an `asyncio` task that wakes every
    settings.worker_poll_interval seconds. It tracks the last-seen
    timestamp per-agent so we only fetch new spans.
    """

    def __init__(self) -> None:
        self._callbacks: List[SpanCallback] = []
        self._task: Optional[asyncio.Task] = None
        self._stop = asyncio.Event()
        self._connected = False
        # Cursors (epoch-seconds) per agent — what we've already processed.
        self._cursors: Dict[str, float] = defaultdict(lambda: 0.0)
        # Last successful poll — used by /api/health.
        self._last_poll_at: Optional[datetime] = None

    # ---- public API -------------------------------------------------------
    def on_span(self, cb: SpanCallback) -> None:
        self._callbacks.append(cb)

    @property
    def connected(self) -> bool:
        return self._connected

    @property
    def last_poll_at(self) -> Optional[datetime]:
        return self._last_poll_at

    async def start(self) -> None:
        if self._task and not self._task.done():
            return
        self._stop.clear()
        self._task = asyncio.create_task(self._poll_loop())
        log.info("PhoenixMCPClient started → %s", settings.phoenix_url)

    async def stop(self) -> None:
        self._stop.set()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except (asyncio.CancelledError, Exception):
                pass
        self._connected = False
        log.info("PhoenixMCPClient stopped.")

    # ---- internal ---------------------------------------------------------
    async def _dispatch(self, ev: SpanEvent) -> None:
        for cb in list(self._callbacks):
            try:
                await cb(ev)
            except Exception:
                log.exception("PhoenixMCP callback failed")

    async def _poll_once(self) -> List[SpanEvent]:
        """Fetch new spans from Phoenix. Returns the parsed events."""
        url = settings.phoenix_url.rstrip("/") + f"/v1/projects/{settings.phoenix_project}/spans"
        params = {
            "limit": str(settings.worker_poll_limit),
            "order": "desc",
        }
        headers = {
            "api_key": settings.arize_api_key,
            "Accept": "application/json",
        }
        out: List[SpanEvent] = []
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, params=params, headers=headers)
                if resp.status_code in (401, 403):
                    log.error("Phoenix auth failed: %s %s", resp.status_code, resp.text[:200])
                    self._connected = False
                    return []
                if resp.status_code >= 500:
                    log.warning("Phoenix 5xx (%s), will retry.", resp.status_code)
                    self._connected = False
                    return []
                resp.raise_for_status()
                payload = resp.json()
        except httpx.HTTPError:
            log.exception("Phoenix poll failed")
            self._connected = False
            return []

        # Phoenix returns either a list or {data: [...]} depending on version.
        items = payload if isinstance(payload, list) else payload.get("data", [])
        for raw in items:
            try:
                ev = self._parse_span(raw)
            except Exception:
                log.exception("Failed to parse Phoenix span")
                continue
            cursor_key = ev.agent
            ts_epoch = ev.ts.timestamp()
            if ts_epoch <= self._cursors[cursor_key]:
                continue
            self._cursors[cursor_key] = ts_epoch
            out.append(ev)

        self._connected = True
        self._last_poll_at = datetime.utcnow()
        return out

    def _parse_span(self, raw: Dict) -> SpanEvent:
        """Normalize a Phoenix span to the internal SpanEvent shape."""
        # Phoenix's OpenInference schema uses snake_case.
        ts_raw = raw.get("start_time") or raw.get("timestamp") or raw.get("ts")
        if isinstance(ts_raw, (int, float)):
            ts = datetime.utcfromtimestamp(float(ts_raw))
        elif isinstance(ts_raw, str):
            ts = datetime.fromisoformat(ts_raw.replace("Z", "+00:00")).astimezone(timezone.utc).replace(tzinfo=None)
        else:
            ts = datetime.utcnow()

        attrs = raw.get("attributes") or {}
        # The agent name lives in attributes.agent.name in OpenInference.
        agent = (
            attrs.get("agent.name")
            or raw.get("name")
            or raw.get("agent")
            or "unknown-agent"
        )
        # Model
        model = (
            attrs.get("llm.model")
            or attrs.get("model")
            or raw.get("model")
            or "gemini-2.5-pro"
        )
        # Tool name
        tool = (
            attrs.get("tool.name")
            or attrs.get("openinference.span.kind")
            or raw.get("tool")
        )
        # Tokens
        tokens = int(
            attrs.get("llm.token_count.total")
            or attrs.get("llm.usage.total_tokens")
            or raw.get("tokens")
            or 0
        )
        # Cost (Phoenix doesn't always have this — estimate from tokens if missing)
        cost = float(
            attrs.get("aegis.cost")
            or raw.get("cost")
            or (tokens * 3.5e-6)
        )
        # Latency
        latency_ms = int(
            attrs.get("aegis.latency_ms")
            or raw.get("latency_ms")
            or 0
        )
        # Span ids
        trace_id = raw.get("trace_id") or raw.get("context.trace_id") or raw.get("id") or "unknown-trace"
        span_id = raw.get("span_id") or raw.get("id") or f"span_{ts.timestamp()}"

        return SpanEvent(
            id=str(span_id),
            trace_id=str(trace_id),
            span_id=str(span_id),
            agent=str(agent),
            model=str(model),
            tool=str(tool) if tool else None,
            tokens=tokens,
            cost=cost,
            latency_ms=latency_ms,
            ts=ts,
            raw=raw,
        )

    def to_trace(self, ev: SpanEvent, status: SpanStatus, summary: str) -> Trace:
        return Trace(
            id=ev.id,
            ts=ev.ts,
            agent=ev.agent,
            model=ev.model,
            tool=ev.tool,
            status=status,
            tokens=ev.tokens,
            cost=ev.cost,
            latencyMs=ev.latency_ms,
            summary=summary,
            traceId=ev.trace_id,
            spanId=ev.span_id,
            attributes={
                "judge_verdict_id": ev.raw.get("attributes", {}).get("aegis.judge_verdict_id"),
            },
        )

    async def _poll_loop(self) -> None:
        """The main polling loop.

        We poll on a fixed interval. On failure we back off exponentially
        up to 60s. On success we reset the backoff.
        """
        backoff = 1.0
        while not self._stop.is_set():
            try:
                events = await self._poll_once()
                backoff = 1.0  # reset on success
                for ev in events:
                    await self._dispatch(ev)
            except Exception:
                log.exception("Poll loop error")
            # Sleep with cancellation support.
            try:
                await asyncio.wait_for(
                    self._stop.wait(),
                    timeout=float(settings.worker_poll_interval),
                )
                break  # stop event fired
            except asyncio.TimeoutError:
                pass
            # Optional exponential backoff if we're disconnected.
            if not self._connected:
                await asyncio.sleep(min(60.0, backoff))
                backoff = min(60.0, backoff * 2.0)
