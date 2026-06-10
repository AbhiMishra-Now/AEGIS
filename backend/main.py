"""AEGIS Sentinel — FastAPI application entrypoint.

LIFECYCLE
---------
1. Lifespan starts:
   - The Worker Agent is created and `await`ed in the background.
   - The Scheduler (cost-spike + token-budget) is started.
   - CORS middleware is configured.
2. The HTTP server serves traffic.
3. On shutdown, the lifespan cancels both tasks gracefully.

SECURITY
--------
* CORS is locked to the frontend origin (CORS_ORIGINS env var).
* All secrets are read from /backend/.env at startup; they never leave
  the process in plaintext.
* Every router uses the schemas in /backend/schemas.py as the public
  contract. Real keys are masked before any response is constructed.

WEBSOCKET
---------
The dashboard connects to /ws and receives JSON envelopes:

  { "type": "span" | "heal" | "loop_detected" | "settings_updated" | "error",
    "data": { ... } }

The server NEVER sends secrets over the socket.
"""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import agents, health, heals, integrations, settings_router, traces
from .wa import worker_agent, register, unregister
from .wa.scheduler import run_scheduler
from .wa.broadcaster import client_count

log = logging.getLogger("aegis")
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)-7s %(name)s · %(message)s",
)


# =============================================================================
# Lifespan — start the Worker Agent + Scheduler
# =============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Boot the Worker Agent (MCP poller) and the Scheduler (cost/budget)."""
    log.info("AEGIS starting · project=%s location=%s agent=%s",
             settings.gcp_project_id, settings.gcp_location, settings.agent_id)

    # Start the worker.
    worker_task = asyncio.create_task(worker_agent._impl.start(), name="mcp-worker")
    # Start the scheduler.
    scheduler_task = asyncio.create_task(run_scheduler(), name="scheduler")

    try:
        yield
    finally:
        log.info("AEGIS shutting down…")
        for t in (worker_task, scheduler_task):
            t.cancel()
        for t in (worker_task, scheduler_task):
            try:
                await t
            except (asyncio.CancelledError, Exception):
                pass
        await worker_agent._impl.stop()


# =============================================================================
# App
# =============================================================================
app = FastAPI(
    title="AEGIS Sentinel API",
    version="1.0.0",
    description=(
        "Zero-Trust oversight engine for GCP Vertex AI agents. "
        "All keys live in /backend/.env and are NEVER returned to the frontend."
    ),
    lifespan=lifespan,
)

# CORS: locked to the frontend origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router,         prefix="/api/health",         tags=["health"])
app.include_router(agents.router,         prefix="/api/agents",         tags=["agents"])
app.include_router(traces.router,         prefix="/api/traces",         tags=["traces"])
app.include_router(heals.router,          prefix="/api/heals",          tags=["heals"])
app.include_router(settings_router.router, prefix="/api/settings",      tags=["settings"])
app.include_router(integrations.router,   prefix="/api/integrations",   tags=["integrations"])


# =============================================================================
# WebSocket — /ws for real-time dashboard updates
# =============================================================================
@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket) -> None:
    """Real-time stream of spans, heals, loop detections, and config
    updates. Each client gets every event; we don't filter per-client
    yet (the dashboard can filter on its side).
    """
    await ws.accept()
    await register(ws)
    log.info("WS connected (n=%d)", client_count())
    try:
        # Hello message so the client knows we're live.
        await ws.send_json({
            "type": "hello",
            "data": {"ok": True, "service": "aegis-sentinel", "version": "1.0.0"},
        })
        while True:
            # We don't expect meaningful inbound messages, but receiving
            # keeps the connection alive and lets clients send pings.
            msg = await ws.receive_text()
            if msg == "ping":
                await ws.send_text("pong")
    except WebSocketDisconnect:
        pass
    except Exception:
        log.exception("WS error")
    finally:
        await unregister(ws)
        log.info("WS disconnected (n=%d)", client_count())


# =============================================================================
# Local entrypoint
# =============================================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
        log_level=settings.log_level.lower(),
    )
