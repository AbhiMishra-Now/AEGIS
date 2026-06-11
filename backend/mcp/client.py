"""Arize Phoenix MCP client + heuristic loop detector.

This client connects to the @arizeai/phoenix-mcp server via stdio
to query traces and spans. We switched from the direct REST API to MCP 
for two key reasons:
  1. API Instability: The Phoenix Cloud REST API is under active development
     and unstable, leading to authentication issues (e.g. 401s).
  2. Hackathon Compliance: Hackathon rules require using the Phoenix MCP server 
     for agent self-introspection.

AUTHENTICATION & CONFIGURATION
------------------------------
  Command: npx
  Args: ["-y", "@arizeai/phoenix-mcp@latest", "--api-key", "<PHOENIX_API_KEY>", "--endpoint", "https://app.phoenix.arize.com"]
"""
from __future__ import annotations

import asyncio
import logging
import json
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Awaitable, Callable, Deque, Dict, List, Optional, Tuple
from contextlib import AsyncExitStack

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from ..config import settings
from ..schemas import Trace, SpanStatus

from dotenv import load_dotenv
load_dotenv()

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
        return [b.isoformat() for b in bucket]


# =============================================================================
# Phoenix MCP client (Stdio wrapper)
# =============================================================================
class PhoenixMCPClient:
    """Connects to the Phoenix MCP server via stdio and queries spans."""

    def __init__(self) -> None:
        self._callbacks: List[SpanCallback] = []
        self._connected = False
        self._exit_stack = AsyncExitStack()
        self._session: Optional[ClientSession] = None
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

    async def connect(self) -> None:
        """Connect to the Phoenix MCP server via stdio."""
        if self._connected:
            return

        api_key = settings.effective_api_key
        log.info("Connecting to Phoenix MCP server via npx @arizeai/phoenix-mcp...")
        
        server_params = StdioServerParameters(
            command="npx",
            args=[
                "-y",  # run non-interactively
                "@arizeai/phoenix-mcp@latest",
                "--api-key",
                api_key,
                "--apiKey",
                api_key,
                "--endpoint",
                settings.phoenix_url,
                "--baseUrl",
                settings.phoenix_url
            ]
        )

        try:
            read_stream, write_stream = await self._exit_stack.enter_async_context(
                stdio_client(server_params)
            )
            self._session = await self._exit_stack.enter_async_context(
                ClientSession(read_stream, write_stream)
            )
            await self._session.initialize()
            
            # Verify connection by listing tools
            tools = await self._session.list_tools()
            log.info("Successfully connected to Phoenix MCP server. Tools: %s", [t.name for t in tools.tools])
            self._connected = True
        except Exception as e:
            log.exception("Failed to connect to Phoenix MCP server")
            await self.disconnect()
            raise

    async def disconnect(self) -> None:
        """Disconnect and clean up subprocess streams."""
        self._connected = False
        self._session = None
        await self._exit_stack.aclose()
        self._exit_stack = AsyncExitStack()
        log.info("Phoenix MCP client disconnected and exit stack cleaned up.")

    async def query_spans(self, project_name: str = "AEGIS", limit: int = 200) -> List[SpanEvent]:
        """Query spans from the Phoenix MCP get-spans tool."""
        if not self._connected or not self._session:
            raise RuntimeError("MCP client is not connected.")

        try:
            # Call the get-spans tool exposed by the MCP server
            result = await self._session.call_tool(
                "get-spans",
                arguments={
                    "project_identifier": project_name,
                    "limit": limit
                }
            )
        except Exception as e:
            log.error("Failed to query spans via MCP tool call: %s", e)
            self._connected = False  # trigger reconnect
            raise

        if not result.content or len(result.content) == 0:
            return []

        text = result.content[0].text
        try:
            data = json.loads(text)
        except Exception as e:
            log.error("Failed to parse get-spans JSON response: %s", e)
            return []

        if isinstance(data, list):
            items = data
        elif isinstance(data, dict):
            items = data.get("spans") or data.get("data") or []
            if not isinstance(items, list):
                items = [items]
        else:
            items = []

        out: List[SpanEvent] = []
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

        self._last_poll_at = datetime.utcnow()
        return out

    def detect_loop_pattern(self, spans: List[SpanEvent]) -> bool:
        """Analyze a list of spans for repeated tool calls within LOOP_WINDOW_SECONDS."""
        detector = LoopDetector()
        for ev in spans:
            if detector.feed(ev, settings.loop_tool_threshold, settings.loop_window_seconds):
                return True
        return False

    async def _dispatch(self, ev: SpanEvent) -> None:
        for cb in list(self._callbacks):
            try:
                await cb(ev)
            except Exception:
                log.exception("PhoenixMCP callback failed")

    def _parse_span(self, raw: Dict) -> SpanEvent:
        """Normalize a Phoenix span to the internal SpanEvent shape."""
        ts_raw = raw.get("start_time") or raw.get("timestamp") or raw.get("ts")
        if isinstance(ts_raw, (int, float)):
            ts = datetime.utcfromtimestamp(float(ts_raw))
        elif isinstance(ts_raw, str):
            ts = datetime.fromisoformat(ts_raw.replace("Z", "+00:00")).astimezone(timezone.utc).replace(tzinfo=None)
        else:
            ts = datetime.utcnow()

        attrs = raw.get("attributes") or {}
        agent = (
            attrs.get("agent.name")
            or raw.get("name")
            or raw.get("agent")
            or "unknown-agent"
        )
        model = (
            attrs.get("llm.model")
            or attrs.get("model")
            or raw.get("model")
            or "gemini-2.5-pro"
        )
        tool = (
            attrs.get("tool.name")
            or attrs.get("openinference.span.kind")
            or raw.get("tool")
        )
        tokens = int(
            attrs.get("llm.token_count.total")
            or attrs.get("llm.usage.total_tokens")
            or raw.get("tokens")
            or 0
        )
        cost = float(
            attrs.get("aegis.cost")
            or raw.get("cost")
            or (tokens * 3.5e-6)
        )
        latency_ms = int(
            attrs.get("aegis.latency_ms")
            or raw.get("latency_ms")
            or 0
        )
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


# =============================================================================
# === LEGACY REST API (DISABLED) ===
# =============================================================================
# import httpx
#
# class PhoenixMCPClientRESTFallback:
#     def __init__(self) -> None:
#         self._callbacks: List[SpanCallback] = []
#         self._task: Optional[asyncio.Task] = None
#         self._stop = asyncio.Event()
#         self._connected = False
#         self._cursors: Dict[str, float] = defaultdict(lambda: 0.0)
#         self._last_poll_at: Optional[datetime] = None
#
#     async def start(self) -> None:
#         if self._task and not self._task.done():
#             return
#         self._stop.clear()
#         self._task = asyncio.create_task(self._poll_loop())
#         log.info("PhoenixMCPClient started → %s", settings.phoenix_url)
#
#     async def stop(self) -> None:
#         self._stop.set()
#         if self._task:
#             self._task.cancel()
#             try:
#                 await self._task
#             except (asyncio.CancelledError, Exception):
#                 pass
#         self._connected = False
#         log.info("PhoenixMCPClient stopped.")
#
#     async def _poll_once(self) -> List[SpanEvent]:
#         """Fetch new spans from Phoenix. Returns the parsed events."""
#         url = settings.phoenix_url.rstrip("/") + f"/v1/projects/{settings.phoenix_project}/spans"
#         params = {
#             "limit": str(settings.worker_poll_limit),
#             "order": "desc",
#         }
#         api_key = settings.effective_api_key
#         headers = {
#             "Authorization": f"Bearer {api_key}",
#             "Content-Type": "application/json",
#             "Accept": "application/json",
#         }
#         out: List[SpanEvent] = []
#         try:
#             async with httpx.AsyncClient(timeout=15.0) as client:
#                 resp = await client.get(url, params=params, headers=headers)
#                 if resp.status_code in (401, 403):
#                     log.error("Phoenix auth failed: %s %s", resp.status_code, resp.text[:200])
#                     self._connected = False
#                     return []
#                 if resp.status_code >= 500:
#                     log.warning("Phoenix 5xx (%s), will retry.", resp.status_code)
#                     self._connected = False
#                     return []
#                 resp.raise_for_status()
#                 payload = resp.json()
#         except httpx.HTTPError:
#             log.exception("Phoenix poll failed")
#             self._connected = False
#             return []
#
#         items = payload if isinstance(payload, list) else payload.get("data", [])
#         for raw in items:
#             try:
#                 ev = self._parse_span(raw)
#             except Exception:
#                 log.exception("Failed to parse Phoenix span")
#                 continue
#             cursor_key = ev.agent
#             ts_epoch = ev.ts.timestamp()
#             if ts_epoch <= self._cursors[cursor_key]:
#                 continue
#             self._cursors[cursor_key] = ts_epoch
#             out.append(ev)
#
#         self._connected = True
#         self._last_poll_at = datetime.utcnow()
#         return out
#
#     async def _poll_loop(self) -> None:
#         backoff = 1.0
#         while not self._stop.is_set():
#             try:
#                 events = await self._poll_once()
#                 backoff = 1.0
#                 for ev in events:
#                     await self._dispatch(ev)
#             except Exception:
#                 log.exception("Poll loop error")
#             try:
#                 await asyncio.wait_for(
#                     self._stop.wait(),
#                     timeout=float(settings.worker_poll_interval),
#                 )
#                 break
#             except asyncio.TimeoutError:
#                 pass
#             if not self._connected:
#                 await asyncio.sleep(min(60.0, backoff))
#                 backoff = min(60.0, backoff * 2.0)
# =============================================================================
