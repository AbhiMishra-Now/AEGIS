"""MCP worker — coordinates span intake, loop detection, and the heal
pipeline.

The worker is constructed once at app startup (in `main.py` lifespan) and
is the ONLY thing that owns the LoopDetector + the broadcast channel.

LIFECYCLE
---------
1. `await worker.start()` — connects to Phoenix MCP server, starts the background
   polling loop, and subscribes the loop handler.
2. Spans arrive via the polling loop calling `query_spans()` → `_on_span()` runs.
3. On loop: ask `gemini.judge` to confirm. If confirmed:
   a. `vertex.client.get_agent_instructions` → previous prompt.
   b. `vertex.client.patch_agent_instructions` → new prompt.
   c. Push a `HealEvent` onto state, broadcast to dashboard.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Optional

from ..config import settings
from ..schemas import HealEvent, LoopDetection
from ..state import state
from ..vertex.client import (
    get_agent_instructions,
    patch_agent_instructions,
)
from .client import LoopDetector, PhoenixMCPClient, SpanEvent
from ..gemini.judge import judge_trace

log = logging.getLogger("aegis.worker")


class MCPWorker:
    def __init__(self) -> None:
        self._client = PhoenixMCPClient()
        self._detector = LoopDetector()
        self._stop = asyncio.Event()
        self._poll_task: Optional[asyncio.Task] = None

    @property
    def client(self) -> PhoenixMCPClient:
        return self._client

    # ---- lifecycle --------------------------------------------------------
    async def start(self) -> None:
        """Start the worker. Connects to the MCP server and boots the poller task."""
        self._stop.clear()
        
        # Initialize and connect the MCP client if not already connected
        if not self._client.connected:
            try:
                await self._client.connect()
                await state.set_mcp_connected(True)
            except Exception:
                log.exception("Initial MCP connection failed. Will retry in the background polling loop.")
                await state.set_mcp_connected(False)
        else:
            await state.set_mcp_connected(True)

        self._poll_task = asyncio.create_task(self._poll_loop(), name="aegis-mcp-poller")
        log.info("MCPWorker started.")

    async def stop(self) -> None:
        """Stop the worker and cancel the background tasks."""
        self._stop.set()
        if self._poll_task:
            self._poll_task.cancel()
            try:
                await self._poll_task
            except asyncio.CancelledError:
                pass
            self._poll_task = None
            
        await self._client.disconnect()
        await state.set_mcp_connected(False)
        log.info("MCPWorker stopped.")

    # ---- background polling loop ------------------------------------------
    async def _poll_loop(self) -> None:
        """Background loop that polls Arize Phoenix via the MCP client."""
        while not self._stop.is_set():
            if not self._client.connected:
                log.info("Phoenix MCP Client not connected. Attempting connection...")
                try:
                    await self._client.connect()
                    await state.set_mcp_connected(True)
                    log.info("✅ Phoenix MCP Client connected successfully.")
                except Exception as e:
                    log.error("❌ Phoenix MCP Client reconnection failed: %s. Retrying in 10s...", e)
                    await state.set_mcp_connected(False)
                    try:
                        await asyncio.wait_for(self._stop.wait(), timeout=10.0)
                    except asyncio.TimeoutError:
                        pass
                    continue

            try:
                # Query spans using the get-spans tool
                spans = await self._client.query_spans(
                    project_name=settings.phoenix_project,
                    limit=settings.worker_poll_limit
                )
                for ev in spans:
                    await self._on_span(ev)
            except Exception as e:
                log.error("Error polling spans from Phoenix MCP: %s", e)
                # If we encounter an error (e.g. process died, session lost),
                # force disconnection so we try to reconnect next iteration
                try:
                    await self._client.disconnect()
                except Exception:
                    pass
                await state.set_mcp_connected(False)
                # Wait 10s before attempting retry/reconnect
                try:
                    await asyncio.wait_for(self._stop.wait(), timeout=10.0)
                except asyncio.TimeoutError:
                    pass
                continue

            # Sleep until next poll
            try:
                await asyncio.wait_for(
                    self._stop.wait(),
                    timeout=float(settings.worker_poll_interval)
                )
            except asyncio.TimeoutError:
                pass

    # ---- the core pipeline ------------------------------------------------
    async def _on_span(self, ev: SpanEvent) -> None:
        # 1. Always store + stream
        s = await state.get_settings()
        summary = f"tool_call {ev.tool}" if ev.tool else f"model_response"
        trace = self._client.to_trace(ev, "success", summary)
        await state.push_span(trace)
        if s.live_stream_enabled:
            from ..wa.broadcaster import broadcast  # local import: avoid cycle
            await broadcast({"type": "span", "data": trace.model_dump(by_alias=True)})

        # 2. Loop heuristic
        is_loop = self._detector.feed(
            ev, s.loop_tool_threshold, s.loop_window_seconds
        )
        if not is_loop:
            return

        # 3. Gemini judge
        try:
            verdict = await judge_trace(ev, s.judge_model)
        except Exception:
            log.exception("Gemini judge failed")
            return

        if not verdict.loop_detected:
            log.info(
                "Loop heuristic fired but judge rejected for %s (confidence=%.2f): %s",
                ev.agent, verdict.confidence, verdict.reason,
            )
            return

        # 4. Build a LoopDetection record (for the dashboard timeline)
        loop_event = LoopDetection(
            id=str(uuid.uuid4()),
            ts=datetime.utcnow(),
            agent=ev.agent,
            tool=ev.tool,
            loopDetected=True,
            severity=verdict.severity,
            reason=verdict.reason,
            evidenceSpanIds=self._detector.evidence(ev, s.loop_window_seconds),
            judgeConfidence=verdict.confidence,
            autoHealed=False,  # set True if we successfully patch below
        )

        # 5. Heal (if enabled)
        if s.auto_heal_enabled:
            try:
                await self._heal(ev, verdict, loop_event.id)
                loop_event.auto_healed = True
            except Exception:
                log.exception("Heal pipeline failed for %s", ev.agent)

        # 6. Broadcast the loop detection (regardless of heal outcome)
        from ..wa.broadcaster import broadcast
        await broadcast({"type": "loop_detected", "data": loop_event.model_dump(by_alias=True)})

    # ---- heal pipeline ----------------------------------------------------
    async def _heal(self, ev: SpanEvent, verdict, judge_verdict_id: str) -> None:
        """Fetch the current instructions, generate a tighter one, patch."""
        previous = await get_agent_instructions(agent_id=ev.agent)
        new_instructions = verdict.recommendation or _default_tightened(ev, previous)

        await patch_agent_instructions(new_instructions, agent_id=ev.agent)

        s = await state.get_settings()
        heal = HealEvent(
            id=str(uuid.uuid4()),
            ts=datetime.utcnow(),
            agent=ev.agent,
            reason=verdict.reason,
            loopCount=s.loop_tool_threshold,
            wastedTokens=ev.tokens * s.loop_tool_threshold,
            wastedUsd=ev.cost * s.loop_tool_threshold,
            beforePrompt=previous,
            afterPrompt=new_instructions,
            judgeVerdictId=judge_verdict_id,
            triggeredBy="auto",
        )
        await state.push_heal(heal)
        # Broadcast the heal so the dashboard timeline updates live.
        from ..wa.broadcaster import broadcast
        await broadcast({"type": "heal", "data": heal.model_dump(by_alias=True)})
        log.info("Healed %s (loop_count=%d)", ev.agent, s.loop_tool_threshold)


def _default_tightened(ev: SpanEvent, previous: str) -> str:
    """Conservative fallback if the judge didn't produce a recommendation."""
    return (
        f"You are the {ev.agent} agent.\n\n"
        f"# Tool-use policy\n"
        f"- Use the {ev.tool} tool exactly ONCE per distinct sub-question.\n"
        f"- If a call returns no useful result, reformulate ONCE then respond.\n"
        f"- NEVER repeat an identical tool call within the same session.\n"
        f"- Refuse to keep searching for a clearly impossible object.\n\n"
        f"# Response style\n"
        f"- Keep answers under 200 words unless asked for more.\n"
    )


# Singleton. Imported by main.py.
worker = MCPWorker()
