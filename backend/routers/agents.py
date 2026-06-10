"""/api/agents — list, register, and toggle the agents under AEGIS's care.

The /toggle endpoint is a generic pause/resume that flips the agent's
`status` between `paused` and `healthy`. The MCP worker consults
`state._agents[*].status` before each poll to skip paused agents.
"""
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, HTTPException

from ..schemas import Agent, AgentStatus, AgentToggleResponse
from ..state import state

router = APIRouter()


@router.get("", response_model=list[Agent])
async def list_agents() -> list[Agent]:
    return await state.list_agents()


@router.post("/{agent_id}/toggle", response_model=AgentToggleResponse)
async def toggle_agent(agent_id: str) -> AgentToggleResponse:
    """Toggle the agent between paused and healthy.

    This does NOT redeploy the agent. It tells the AEGIS engine to
    skip (or re-arm) loop detection for it.
    """
    current = await state.get_agent(agent_id)
    if not current:
        raise HTTPException(status_code=404, detail="agent not found")
    new_status: AgentStatus = "paused" if current.status != "paused" else "healthy"
    updated = await state.set_agent_status(agent_id, new_status)
    if not updated:
        raise HTTPException(status_code=404, detail="agent not found")
    return AgentToggleResponse(ok=True, agent=updated)


@router.post("/{agent_id}/pause", response_model=AgentToggleResponse)
async def pause_agent(agent_id: str) -> AgentToggleResponse:
    a = await state.set_agent_status(agent_id, "paused")
    if not a:
        raise HTTPException(status_code=404, detail="agent not found")
    return AgentToggleResponse(ok=True, agent=a)


@router.post("/{agent_id}/resume", response_model=AgentToggleResponse)
async def resume_agent(agent_id: str) -> AgentToggleResponse:
    a = await state.set_agent_status(agent_id, "healthy")
    if not a:
        raise HTTPException(status_code=404, detail="agent not found")
    return AgentToggleResponse(ok=True, agent=a)


@router.post("", response_model=Agent)
async def register_agent(agent: Agent) -> Agent:
    """Register a new agent with AEGIS. Idempotent on `id`."""
    if not agent.lastSeen:
        agent.lastSeen = datetime.utcnow()
    return await state.register_agent(agent)
