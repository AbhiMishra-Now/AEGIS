"""/api/heals — list, trigger, and inspect auto-heal events.

  GET  /api/heals            list recent heals
  GET  /api/heals/log        same, aliased for the dashboard's "log" view
  GET  /api/heals/{heal_id}  one heal
  POST /api/heals/trigger    force a manual heal for a specific agent
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ..schemas import HealEvent
from ..state import state
from ..wa import worker_agent
from ..wa.broadcaster import broadcast

router = APIRouter()


class TriggerHealRequest(BaseModel):
    agent_id: str = Field(..., alias="agentId")
    reason: Optional[str] = Field(None, alias="reason")


class TriggerHealResponse(BaseModel):
    ok: bool
    heal: HealEvent


@router.get("", response_model=list[HealEvent])
async def list_heals(limit: int = Query(100, ge=1, le=500)) -> list[HealEvent]:
    return await state.list_heals(limit=limit)


@router.get("/log", response_model=list[HealEvent])
async def list_heals_log(limit: int = Query(100, ge=1, le=500)) -> list[HealEvent]:
    return await state.list_heals(limit=limit)


@router.get("/{heal_id}", response_model=HealEvent)
async def get_heal(heal_id: str) -> HealEvent:
    h = await state.get_heal(heal_id)
    if not h:
        raise HTTPException(status_code=404, detail="heal not found")
    return h


@router.post("/trigger", response_model=TriggerHealResponse)
async def trigger_heal(req: TriggerHealRequest) -> TriggerHealResponse:
    """Force a manual heal for an agent without waiting for the heuristic.

    This is the "panic button" — the operator kicks the Worker Agent
    to patch the agent's instructions immediately.
    """
    if not req.agent_id:
        raise HTTPException(status_code=400, detail="agentId is required")

    a = await state.get_agent(req.agent_id)
    if not a:
        raise HTTPException(status_code=404, detail="agent not found")

    await worker_agent.trigger_manual_heal(req.agent_id, req.reason or "")
    # Find the heal we just pushed (the most recent one for this agent).
    heals = await state.list_heals(limit=5)
    heal = next((h for h in heals if h.agent == req.agent_id), None)
    if not heal:
        raise HTTPException(status_code=500, detail="heal failed to record")
    return TriggerHealResponse(ok=True, heal=heal)
