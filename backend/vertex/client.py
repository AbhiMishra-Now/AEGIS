"""GCP Vertex AI Agent Builder SDK wrapper (backend-only).

This module is the ONLY place in the codebase that:
  1. Constructs a `google.cloud.aiplatform` client.
  2. Initializes OpenInference instrumentation so every Vertex AI call
     emits a span into Arize Phoenix automatically.
  3. Invokes the Agent Builder agent and patches its instructions.

SECURITY: the service-account JSON is read from disk ONCE at process
startup. The plaintext key is never sent to the frontend.

INITIALIZATION FLOW
-------------------
1. Load service-account credentials from GCP_SERVICE_ACCOUNT_JSON_PATH.
2. Call `aiplatform.init(project=..., location=..., credentials=...)`.
3. Install the OpenInference instrumentor so every Vertex AI call is
   traced to Phoenix via the OTLP exporter.
4. Construct the AgentClient (cached for the process).

The instrumentor is installed exactly once; repeated calls are no-ops.
"""
from __future__ import annotations

import asyncio
import logging
import os
from functools import lru_cache
from typing import Any, Dict, List, Optional

from ..config import settings

log = logging.getLogger("aegis.vertex")

# Lazy globals: we do NOT import google-cloud-aiplatform at module load so
# tests can import this file without GCP credentials present.
_vertex_initialized = False
_agent_client = None
_aiplatform = None
_credentials = None


# =============================================================================
# OpenInference / Phoenix trace exporter setup
# =============================================================================
def _setup_tracing() -> None:
    """Configure an OTLP exporter that ships spans to Phoenix.

    Phoenix ingests OpenTelemetry OTLP over HTTP at:
        {PHOENIX_URL}/v1/traces

    We rely on the standard env-var pair the OpenTelemetry SDK reads:
        OTEL_EXPORTER_OTLP_ENDPOINT
        OTEL_EXPORTER_OTLP_HEADERS
    """
    endpoint = settings.phoenix_url.rstrip("/") + "/v1/traces"
    os.environ.setdefault("OTEL_EXPORTER_OTLP_ENDPOINT", endpoint)
    os.environ.setdefault("OTEL_EXPORTER_OTLP_HEADERS", f"api_key={settings.arize_api_key}")
    os.environ.setdefault("OTEL_SERVICE_NAME", "aegis-sentinel")
    log.info("OpenInference tracing configured → %s", endpoint)


# =============================================================================
# Vertex AI client
# =============================================================================
def _ensure_vertex() -> None:
    """Lazy-init the Vertex AI SDK + OpenInference instrumentor."""
    global _vertex_initialized, _agent_client, _aiplatform, _credentials
    if _vertex_initialized:
        return

    # 1) Tracing
    _setup_tracing()

    # 2) Lazy import
    from google.cloud import aiplatform  # type: ignore
    from google.oauth2 import service_account  # type: ignore

    _aiplatform = aiplatform

    # 3) Credentials
    if settings.gcp_service_account_json_path and os.path.exists(
        settings.gcp_service_account_json_path
    ):
        _credentials = service_account.Credentials.from_service_account_file(
            settings.gcp_service_account_json_path
        )
        log.info("Loaded GCP service account from %s", settings.gcp_service_account_json_path)
    else:
        # Fall back to application-default credentials (works on Cloud Run,
        # GKE, GCE, or `gcloud auth application-default login`).
        log.warning(
            "Service account JSON not found at %s — falling back to ADC.",
            settings.gcp_service_account_json_path,
        )
        _credentials = None

    # 4) Vertex init
    aiplatform.init(
        project=settings.gcp_project_id,
        location=settings.gcp_location,
        credentials=_credentials,
    )

    # 5) Install OpenInference instrumentor. This is what makes the calls
    #    show up in Arize Phoenix as spans. The instrumentor wraps the
    #    google-cloud-aiplatform client and emits a span for every call.
    try:
        from openinference.instrumentation.vertexai import VertexAIInstrumentor  # type: ignore
        VertexAIInstrumentor().instrument()
        log.info("OpenInference VertexAIInstrumentor installed.")
    except Exception:
        log.exception("OpenInference instrumentor failed to install — traces will not be exported.")

    _vertex_initialized = True


@lru_cache(maxsize=1)
def _get_agent_client():
    """Lazily construct + cache a Vertex AI Agent client."""
    global _agent_client
    _ensure_vertex()
    # The exact API name depends on the SDK version. As of 1.70+:
    #   aiplatform.AgentClient(...)
    try:
        _agent_client = _aiplatform.AgentClient()  # type: ignore[attr-defined]
    except AttributeError:
        # Older SDKs expose it under a different name.
        _agent_client = _aiplatform.agents.AgentClient()  # type: ignore[attr-defined]
    return _agent_client


# =============================================================================
# Public API
# =============================================================================
async def invoke_agent(
    agent_id: Optional[str] = None,
    prompt: str = "",
    *,
    project: Optional[str] = None,
    location: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Send a prompt to the Vertex AI Agent Builder agent.

    Returns a structured dict. The SDK itself is sync, so we run it in
    a thread to keep the event loop free.

    The OpenInference instrumentor installed in `_ensure_vertex()` will
    automatically emit a span for this call into Arize Phoenix.
    """
    agent_id = agent_id or settings.agent_id
    project = project or settings.gcp_project_id
    location = location or settings.gcp_location

    def _do_invoke() -> Dict[str, Any]:
        client = _get_agent_client()
        resource_name = (
            f"projects/{project}/locations/{location}/agents/{agent_id}"
        )
        # As of Vertex AI Agent Builder 1.70:
        #   client.invoke_agent(name=resource_name, input=prompt, ...)
        try:
            resp = client.invoke_agent(  # type: ignore[attr-defined]
                name=resource_name,
                input=prompt,
                **(extra or {}),
            )
        except AttributeError:
            # Older SDKs: client.agents.invoke(name=..., input=...)
            resp = client.agents.invoke(  # type: ignore[attr-defined]
                name=resource_name,
                input=prompt,
                **(extra or {}),
            )
        # Normalize to a dict
        if hasattr(resp, "model_dump"):
            return resp.model_dump()
        if hasattr(resp, "__dict__"):
            return dict(resp.__dict__)
        return {"raw": str(resp)}

    return await asyncio.to_thread(_do_invoke)


async def get_agent_instructions(
    agent_id: Optional[str] = None,
    *,
    project: Optional[str] = None,
    location: Optional[str] = None,
) -> str:
    """Fetch the current `instructions` field of the agent."""
    agent_id = agent_id or settings.agent_id
    project = project or settings.gcp_project_id
    location = location or settings.gcp_location

    def _do_get() -> str:
        client = _get_agent_client()
        resource_name = (
            f"projects/{project}/locations/{location}/agents/{agent_id}"
        )
        try:
            agent = client.get_agent(name=resource_name)  # type: ignore[attr-defined]
        except AttributeError:
            agent = client.agents.get(name=resource_name)  # type: ignore[attr-defined]
        # agent.instructions may be a string OR a list of {content: "..."}
        instr = getattr(agent, "instructions", "") or ""
        if isinstance(instr, list):
            return "\n".join(
                (p.get("content") if isinstance(p, dict) else str(p)) for p in instr
            )
        return str(instr)

    return await asyncio.to_thread(_do_get)


async def patch_agent_instructions(
    new_instructions: str,
    agent_id: Optional[str] = None,
    *,
    project: Optional[str] = None,
    location: Optional[str] = None,
) -> None:
    """Atomically patch the agent's instructions via the Vertex AI SDK.

    The SDK call is a PATCH on the agent resource. The OpenInference
    instrumentor will emit a span for this call, which the worker can
    then correlate with the loop detection span that triggered the heal.
    """
    agent_id = agent_id or settings.agent_id
    project = project or settings.gcp_project_id
    location = location or settings.gcp_location

    def _do_patch() -> None:
        client = _get_agent_client()
        resource_name = (
            f"projects/{project}/locations/{location}/agents/{agent_id}"
        )
        try:
            client.update_agent(  # type: ignore[attr-defined]
                name=resource_name,
                instructions=new_instructions,
            )
        except AttributeError:
            # Older SDKs: client.agents.patch(name=..., instructions=...)
            client.agents.patch(  # type: ignore[attr-defined]
                name=resource_name,
                instructions=new_instructions,
            )

    await asyncio.to_thread(_do_patch)
    log.info(
        "Patched agent %s instructions (%d chars) in %s/%s",
        agent_id,
        len(new_instructions),
        project,
        location,
    )


async def list_recent_tool_calls(
    agent_id: str,
    *,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """Best-effort fetch of recent tool calls for an agent.

    Uses the Agent Sessions API if available, else falls back to an
    empty list. This is a hint for the heal-prompt generator; it does
    not need to be authoritative.
    """
    def _do_list() -> List[Dict[str, Any]]:
        client = _get_agent_client()
        resource_name = (
            f"projects/{settings.gcp_project_id}/locations/{settings.gcp_location}/agents/{agent_id}"
        )
        try:
            sessions = client.list_sessions(parent=resource_name, page_size=limit)  # type: ignore[attr-defined]
        except AttributeError:
            return []
        out: List[Dict[str, Any]] = []
        for s in sessions:
            if hasattr(s, "model_dump"):
                out.append(s.model_dump())
            elif hasattr(s, "__dict__"):
                out.append(dict(s.__dict__))
            else:
                out.append({"raw": str(s)})
        return out

    return await asyncio.to_thread(_do_list)
