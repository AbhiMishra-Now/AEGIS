"""Worker Agent package.

The Worker Agent is the autonomous service that:
  1. Polls Arize Phoenix via MCP.
  2. Detects loops (heuristic + Gemini judge).
  3. Heals the offending Vertex AI agent (in-place PATCH).
  4. Pushes real-time updates to the dashboard over WebSocket.

Modules:
  broadcaster  — async fan-out for the WebSocket
  worker       — the main background coroutine
  scheduler    — periodic tasks (cost-spike, token-budget checks)
"""
from .broadcaster import broadcast, register, unregister
from .worker import worker_agent

__all__ = [
    "broadcast",
    "register",
    "unregister",
    "worker_agent",
]
