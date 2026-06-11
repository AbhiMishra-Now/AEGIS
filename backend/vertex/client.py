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
_local_agent_instructions = {}
DEFAULT_PREAMBLE = (
    "You are a helpful assistant. Answer questions using ONLY the provided knowledge base.\n"
    "If the answer is not in the knowledge base, say 'I cannot find that information.'\n"
    "Do NOT make up answers. Do NOT repeat the same search query more than twice."
)

def _setup_tracing() -> None:
    """Configure OTLP exporter to ship spans to Arize Phoenix Cloud."""
    import os
    
    # Use EXACT collector endpoint from UI including /s/... subpath
    collector_url = os.getenv("PHOENIX_COLLECTOR_ENDPOINT") 
    if not collector_url:
        collector_url = f"{os.getenv('PHOENIX_URL', 'https://app.phoenix.arize.com')}/v1/traces"

    log.info("Registering trace exporter to %s", collector_url)

    try:
        from phoenix.otel import register
        log.info("Registering trace exporter via phoenix.otel.register...")
        register(
            project_name=os.getenv("PHOENIX_PROJECT", "AEGIS"),
            endpoint=collector_url,
            headers={"Authorization": f"Bearer {os.getenv('PHOENIX_API_KEY')}"},
            batch=True,
        )
        log.info("Phoenix OTEL TracerProvider registered successfully.")
        return
    except ImportError:
        log.info("arize-phoenix package not found. Falling back to native OpenTelemetry SDK.")
    except Exception:
        log.exception("phoenix.otel.register failed, trying fallback.")

    # Fallback to standard OpenTelemetry SDK setup
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import Resource

        log.info("Setting up OpenTelemetry exporter for Arize Phoenix...")

        # Setup resource attributes
        resource = Resource(attributes={
            "service.name": "aegis-sentinel",
            "project.name": os.getenv("PHOENIX_PROJECT", "AEGIS")
        })
        
        provider = TracerProvider(resource=resource)
        
        headers = {
            "Authorization": f"Bearer {os.getenv('PHOENIX_API_KEY')}",
            "x-project-name": os.getenv("PHOENIX_PROJECT", "AEGIS")
        }
        
        exporter = OTLPSpanExporter(
            endpoint=collector_url,
            headers=headers
        )
        processor = BatchSpanProcessor(exporter)
        provider.add_span_processor(processor)
        
        # Set global tracer provider
        trace.set_tracer_provider(provider)
        
        log.info("Fallback OpenTelemetry TracerProvider registered successfully → %s", collector_url)
    except Exception:
        log.exception("Failed to register native OpenTelemetry TracerProvider")

    os.environ.setdefault("OTEL_EXPORTER_OTLP_ENDPOINT", collector_url)
    os.environ.setdefault("OTEL_EXPORTER_OTLP_HEADERS", f"Authorization=Bearer {os.getenv('PHOENIX_API_KEY')}")
    os.environ.setdefault("OTEL_SERVICE_NAME", "aegis-sentinel")
    log.info("OpenInference environment configured → %s", collector_url)


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
        location=settings.gcp_location if settings.gcp_location != "global" else "us-central1",
        credentials=_credentials,
    )

    # 5) Install OpenInference instrumentor. This is what makes the calls
    #    show up in Arize Phoenix as spans.
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
    try:
        _agent_client = _aiplatform.AgentClient()  # type: ignore[attr-defined]
    except AttributeError:
        _agent_client = _aiplatform.agents.AgentClient()  # type: ignore[attr-defined]
    return _agent_client


def _get_credentials():
    """Get GCP credentials with appropriate scopes for REST API calls."""
    from google.oauth2 import service_account
    import google.auth
    
    if settings.gcp_service_account_json_path and os.path.exists(
        settings.gcp_service_account_json_path
    ):
        return service_account.Credentials.from_service_account_file(
            settings.gcp_service_account_json_path,
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
    else:
        creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        return creds


def _get_access_token() -> Optional[str]:
    """Refresh credentials and return the OAuth2 access token."""
    try:
        from google.auth.transport.requests import Request
        creds = _get_credentials()
        if creds and creds.valid:
            return creds.token
        elif creds:
            creds.refresh(Request())
            return creds.token
    except Exception:
        log.exception("Failed to retrieve access token. Returning mock-gcp-token fallback.")
    return "mock-gcp-token"


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
    """Send a prompt to the Discovery Engine :answer endpoint.

    This uses the direct REST API with service account authentication
    and manually instruments the call with OpenTelemetry/OpenInference.
    """
    import httpx
    import uuid
    from opentelemetry import trace

    agent_id = agent_id or settings.agent_id
    project = project or settings.gcp_project_id
    location = location or settings.gcp_location

    _ensure_vertex()

    # Get access token
    access_token = _get_access_token()
    if not access_token:
        log.error("Could not retrieve GCP access token.")
        return {"response": "Error: Could not retrieve GCP access token.", "trace_id": ""}

    # Get preamble/instructions
    preamble = await get_agent_instructions(agent_id=agent_id, project=project, location=location)

    # Endpoint URL (v1alpha servingConfigs :answer)
    host = "discoveryengine.googleapis.com"
    if location:
        if location.startswith("us"):
            host = "us-discoveryengine.googleapis.com"
        elif location.startswith("eu"):
            host = "eu-discoveryengine.googleapis.com"
    url = f"https://{host}/v1alpha/projects/{project}/locations/{location}/collections/default_collection/engines/{agent_id}/servingConfigs/default_search:answer"

    payload = {
        "query": {
            "text": prompt,
        },
        "session": f"projects/{project}/locations/{location}/collections/default_collection/engines/{agent_id}/sessions/-",
        "answerGenerationSpec": {
            "promptSpec": {
                "preamble": preamble
            },
            "modelSpec": {"modelVersion": "stable"},
            "includeCitations": True
        }
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    ot_tracer = trace.get_tracer("aegis-sentinel")
    answer_text = ""
    trace_id = ""

    # Start OTEL Span
    with ot_tracer.start_as_current_span("AgentClient.invoke_agent") as span:
        span.set_attribute("openinference.span.kind", "LLM")
        span.set_attribute("input.value", prompt)
        span.set_attribute("llm.model_name", "discovery-engine-answer")
        span.set_attribute("llm.prompts", [preamble + "\n\nQuery: " + prompt])

        try:
            async with httpx.AsyncClient(timeout=30.0) as http_client:
                resp = await http_client.post(url, json=payload, headers=headers)
                
                if resp.status_code != 200:
                    log.error("Discovery Engine error: status=%d, text=%s", resp.status_code, resp.text)
                    try:
                        resp_data = resp.json()
                        error_msg = f"Discovery Engine error: {resp_data.get('error', {}).get('message', resp.text)}"
                    except Exception:
                        resp_data = {}
                        error_msg = f"Discovery Engine error (status={resp.status_code}): {resp.text}"
                    
                    span.set_attribute("error", True)
                    span.set_attribute("error.message", error_msg)
                    span.set_attribute("output.value", error_msg)
                    
                    context = span.get_span_context()
                    trace_id = format(context.trace_id, '032x')
                    return {"response": error_msg, "trace_id": trace_id, "raw": resp_data}

                resp_data = resp.json()
                answer_text = resp_data.get("answer", {}).get("answerText", "")
                span.set_attribute("output.value", answer_text)

                # Get trace ID to return to the client
                context = span.get_span_context()
                trace_id = format(context.trace_id, '032x')

                return {
                    "response": answer_text,
                    "trace_id": trace_id,
                    "raw": resp_data
                }

        except Exception as e:
            log.exception("Error calling Discovery Engine API")
            error_msg = f"Error calling Discovery Engine API: {e}"
            span.set_attribute("error", True)
            span.set_attribute("error.message", str(e))
            span.set_attribute("output.value", error_msg)

            context = span.get_span_context()
            trace_id = format(context.trace_id, '032x')

            return {
                "response": error_msg,
                "trace_id": trace_id,
                "raw": {}
            }


async def get_agent_instructions(
    agent_id: Optional[str] = None,
    *,
    project: Optional[str] = None,
    location: Optional[str] = None,
) -> str:
    """Fetch the current instructions (preamble) for the agent."""
    agent_id = agent_id or settings.agent_id
    project = project or settings.gcp_project_id
    location = location or settings.gcp_location

    if agent_id in _local_agent_instructions:
        return _local_agent_instructions[agent_id]

    def _do_get() -> str:
        client = _get_agent_client()
        resource_name = (
            f"projects/{project}/locations/{location}/agents/{agent_id}"
        )
        try:
            agent = client.get_agent(name=resource_name)
        except AttributeError:
            agent = client.agents.get(name=resource_name)
        instr = getattr(agent, "instructions", "") or ""
        if isinstance(instr, list):
            return "\n".join(
                (p.get("content") if isinstance(p, dict) else str(p)) for p in instr
            )
        return str(instr)

    try:
        instructions = await asyncio.to_thread(_do_get)
        if instructions:
            _local_agent_instructions[agent_id] = instructions
            return instructions
    except Exception as e:
        log.warning("Could not fetch agent instructions from GCP via SDK: %s. Using default.", e)

    return _local_agent_instructions.get(agent_id, DEFAULT_PREAMBLE)


async def patch_agent_instructions(
    new_instructions: str,
    agent_id: Optional[str] = None,
    *,
    project: Optional[str] = None,
    location: Optional[str] = None,
) -> None:
    """Patch the agent's instructions in GCP and update the local cache."""
    agent_id = agent_id or settings.agent_id
    project = project or settings.gcp_project_id
    location = location or settings.gcp_location

    _local_agent_instructions[agent_id] = new_instructions

    def _do_patch() -> None:
        client = _get_agent_client()
        resource_name = (
            f"projects/{project}/locations/{location}/agents/{agent_id}"
        )
        try:
            client.update_agent(
                name=resource_name,
                instructions=new_instructions,
            )
        except AttributeError:
            client.agents.patch(
                name=resource_name,
                instructions=new_instructions,
            )

    try:
        await asyncio.to_thread(_do_patch)
        log.info("Successfully patched GCP Agent instructions for %s", agent_id)
    except Exception as e:
        log.warning("Could not patch agent instructions in GCP via SDK: %s. Saved to local cache only.", e)


async def list_recent_tool_calls(
    agent_id: str,
    *,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """Best-effort fetch of recent tool calls for an agent."""
    def _do_list() -> List[Dict[str, Any]]:
        client = _get_agent_client()
        resource_name = (
            f"projects/{settings.gcp_project_id}/locations/{settings.gcp_location}/agents/{agent_id}"
        )
        try:
            sessions = client.list_sessions(parent=resource_name, page_size=limit)
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
