"""WebSocket broadcaster.

The dashboard opens a single WebSocket at /ws/dashboard. The Worker
Agent (and any router that wants to push an event) calls
`broadcast(payload)`. We fan out to every connected client.

The payload is any JSON-serializable dict. We NEVER include secrets.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Set

from fastapi import WebSocket

log = logging.getLogger("aegis.ws")
_clients: Set[WebSocket] = set()
_lock = asyncio.Lock()


async def register(ws: WebSocket) -> None:
    async with _lock:
        _clients.add(ws)


async def unregister(ws: WebSocket) -> None:
    async with _lock:
        _clients.discard(ws)


async def broadcast(payload: Any) -> None:
    """Push a JSON-serializable payload to every connected dashboard."""
    text = json.dumps(payload, default=str)
    async with _lock:
        dead: list[WebSocket] = []
        for ws in list(_clients):
            try:
                await ws.send_text(text)
            except Exception:
                dead.append(ws)
        for ws in dead:
            _clients.discard(ws)


def client_count() -> int:
    return len(_clients)
