"""Periodic scheduler for cost-spike + token-budget checks.

A separate coroutine that wakes every N seconds and:
  1. Walks recent spans from state.
  2. Computes per-minute cost; if it exceeds `cost_spike_threshold`,
      forces a heal.
  3. Computes hourly token spend; if it exceeds `token_budget_per_hour`,
      marks the agent as `paused` and pushes a WebSocket event.

Runs as a sibling task to the MCP worker.
"""
from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict

from ..config import settings
from ..state import state
from .broadcaster import broadcast

log = logging.getLogger("aegis.scheduler")


async def run_scheduler() -> None:
    """Main loop. Runs forever; cancelled on app shutdown."""
    while True:
        try:
            await _tick()
        except Exception:
            log.exception("Scheduler tick failed")
        await asyncio.sleep(15)


async def _tick() -> None:
    """One pass: cost-spike + token-budget enforcement."""
    s = await state.get_settings()
    spans = await state.list_spans(limit=500)

    # Aggregate per-agent per-minute cost
    minute_buckets: Dict[tuple[str, str], float] = defaultdict(float)
    hour_buckets: Dict[str, int] = defaultdict(int)
    now = datetime.utcnow()

    for sp in spans:
        age = (now - sp.ts).total_seconds()
        if age < 0:
            continue
        # Token budget (rolling 1h)
        if age <= 3600:
            hour_buckets[sp.agent] += sp.tokens
        # Cost spike (per minute)
        if age <= 60:
            minute_buckets[(sp.agent, sp.ts.strftime("%Y-%m-%dT%H:%M"))] += sp.cost

    # Cost spike: any agent over threshold in last minute → warn
    for (agent, _), cost in minute_buckets.items():
        if cost > s.cost_spike_threshold:
            await broadcast({
                "type": "loop_detected",
                "data": {
                    "id": f"cost_{agent}_{now.timestamp()}",
                    "ts": now.isoformat(),
                    "agent": agent,
                    "tool": None,
                    "loopDetected": True,
                    "severity": "high",
                    "reason": f"cost spike: ${cost:.3f} in last 60s (threshold ${s.cost_spike_threshold})",
                    "evidenceSpanIds": [],
                    "judgeConfidence": 1.0,
                    "autoHealed": False,
                },
            })

    # Token budget: any agent over the 1h cap → pause
    for agent, tokens in hour_buckets.items():
        if tokens > s.token_budget_per_hour:
            a = await state.get_agent(agent)
            if a and a.status != "paused":
                await state.set_agent_status(agent, "paused")
                await broadcast({
                    "type": "loop_detected",
                    "data": {
                        "id": f"budget_{agent}_{now.timestamp()}",
                        "ts": now.isoformat(),
                        "agent": agent,
                        "tool": None,
                        "loopDetected": True,
                        "severity": "critical",
                        "reason": f"token budget exceeded: {tokens} > {s.token_budget_per_hour}/h",
                        "evidenceSpanIds": [],
                        "judgeConfidence": 1.0,
                        "autoHealed": False,
                    },
                })
                log.warning("Paused %s for exceeding token budget", agent)
