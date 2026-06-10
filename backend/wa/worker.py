"""The Worker Agent.

The Worker Agent is the long-lived coroutine that powers AEGIS. It:
  1. Owns the PhoenixMCPClient.
  2. Runs the loop-detection pipeline.
  3. On a confirmed loop, calls the Vertex AI SDK to patch the agent's
     instructions.
  4. Pushes everything to the dashboard via the broadcaster.

This module is intentionally separate from `mcp.worker.py` — the latter
is a thin compatibility shim that re-exports the singleton. `wa.worker`
is the authoritative entrypoint used by `main.py` lifespan.
"""
from __future__ import annotations

import asyncio
import logging

from ..mcp.client import PhoenixMCPClient
from ..mcp.worker import MCPWorker

log = logging.getLogger("aegis.wa")


class WorkerAgent:
    """Lifecycle owner of the MCP poller + heal pipeline.

    Use as an async context manager:

        async with WorkerAgent() as wa:
            await wa.run_forever()
    """

    def __init__(self) -> None:
        self._impl = MCPWorker()

    async def __aenter__(self) -> "WorkerAgent":
        await self._impl.start()
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        await self._impl.stop()

    # Delegated helpers — routers call these for manual heals.
    async def trigger_manual_heal(self, agent_id: str, reason: str) -> None:
        """Force a heal without waiting for the heuristic.

        Used by POST /api/heals/trigger.
        """
        from datetime import datetime
        import uuid
        from ..schemas import HealEvent
        from ..state import state
        from ..vertex.client import (
            get_agent_instructions,
            patch_agent_instructions,
        )

        previous = await get_agent_instructions(agent_id=agent_id)
        # Conservative tightened prompt
        new_prompt = (
            f"You are the {agent_id} agent.\n\n"
            "# Tool-use policy\n"
            "- Use each tool exactly ONCE per distinct sub-question.\n"
            "- If a call returns no useful result, reformulate ONCE then respond.\n"
            "- NEVER repeat an identical tool call within the same session.\n"
            "- Refuse to keep searching for a clearly impossible object.\n"
        )
        await patch_agent_instructions(new_prompt, agent_id=agent_id)
        s = await state.get_settings()
        heal = HealEvent(
            id=str(uuid.uuid4()),
            ts=datetime.utcnow(),
            agent=agent_id,
            reason=reason or "manual heal triggered by operator",
            loopCount=s.loop_tool_threshold,
            wastedTokens=0,
            wastedUsd=0.0,
            beforePrompt=previous,
            afterPrompt=new_prompt,
            judgeVerdictId=None,
            triggeredBy="manual",
        )
        await state.push_heal(heal)
        from .broadcaster import broadcast
        await broadcast({"type": "heal", "data": heal.model_dump(by_alias=True)})
        log.info("Manual heal complete for %s", agent_id)


# Singleton — used by main.py lifespan and the heals router.
worker_agent = WorkerAgent()
