"""/api/health — system status.

Returns the liveness of the service + the connection state of the
MCP worker and Vertex AI client. Never includes secrets.
"""
from fastapi import APIRouter

from ..schemas import HealthResponse
from ..config import settings
from ..state import state
from ..vertex.client import _ensure_vertex

router = APIRouter()


@router.get("", response_model=HealthResponse)
async def health() -> HealthResponse:
    snap = await state.snapshot_health()
    mcp_ok = bool(snap.get("mcp_connected"))
    vertex_ok = True
    try:
        _ensure_vertex()
    except Exception:
        vertex_ok = False
    status = "ok" if mcp_ok and vertex_ok else "degraded"
    return HealthResponse(
        status=status,
        service="aegis-sentinel",
        version="1.0.0",
        mcpConnected=mcp_ok,
        vertexConfigured=vertex_ok,
        activeAgents=int(snap.get("active_agents", 0)),
        lastHealAt=snap.get("last_heal_at"),
    )
