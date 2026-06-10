"""/api/traces — fetch recent spans.

We expose a paginated list of recent spans. The MCP worker pushes new
spans into `state._spans` as they arrive. This router is a thin
read-side.
"""
from fastapi import APIRouter, Query

from ..schemas import Trace
from ..state import state

router = APIRouter()


@router.get("", response_model=list[Trace])
async def list_traces(limit: int = Query(100, ge=1, le=500)) -> list[Trace]:
    return await state.list_spans(limit=limit)


@router.get("/agent/{agent_id}", response_model=list[Trace])
async def list_traces_for_agent(
    agent_id: str, limit: int = Query(50, ge=1, le=500)
) -> list[Trace]:
    spans = await state.list_spans(limit=500)
    return [s for s in spans if s.agent == agent_id][:limit]
