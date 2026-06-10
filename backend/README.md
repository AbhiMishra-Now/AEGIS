# AEGIS Sentinel — Backend

A Zero-Trust Python FastAPI service that:
- Subscribes to Arize Phoenix MCP for live spans from your GCP Vertex AI agents.
- Detects runaway tool-call loops with a sliding-window heuristic + Gemini judge.
- Patches the offending agent's instructions via the Vertex AI SDK.
- Streams everything to the React dashboard over a single WebSocket.

Built for the **Google Cloud x Arize MCP Hackathon**.

## Security model (NON-NEGOTIABLE)

1. **No direct browser → external API.** The frontend ONLY calls this service.
2. **All secrets live in `/backend/.env`.** Real key values are never serialized
   to any HTTP response. `GET /api/integrations` returns only masked
   representations like `arize_phx_••••••••••3a91`.
3. **CORS is locked to the frontend origin.** The `CORS_ORIGINS` env var
   controls the allow-list; defaults to `http://localhost:3000` (Next.js) and
   `http://localhost:5173` (Vite dev).
4. **Rotate is server-side only.** `POST /api/integrations/:provider/rotate`
   mints a new value, writes it to `.env`, and prints it once to the server
   stdout. The new value is NEVER returned over HTTP.

## File map

```
backend/
├── main.py                 # FastAPI app + lifespan (boots Worker Agent + Scheduler)
├── config.py               # pydantic-settings, reads .env
├── schemas.py              # Public response models (frontend-facing, masked)
├── state.py                # In-process state (async-safe; persisted to state.json)
├── routers/
│   ├── health.py           # GET  /api/health
│   ├── agents.py           # GET/POST /api/agents  · POST /api/agents/:id/{toggle,pause,resume}
│   ├── traces.py           # GET  /api/traces  · GET /api/traces/agent/:id
│   ├── heals.py            # GET  /api/heals  · POST /api/heals/trigger
│   ├── settings_router.py  # GET/POST/PUT /api/settings
│   └── integrations.py     # GET /api/integrations  · POST /:provider/rotate  · POST /webhook/arize
├── mcp/                    # Arize Phoenix integration
│   ├── client.py           # PhoenixMCPClient (REST poller) + LoopDetector (heuristic)
│   └── worker.py           # Loop pipeline: span → judge → heal
├── vertex/                 # GCP Vertex AI Agent Builder SDK wrapper
│   └── client.py           # invoke_agent / get_agent_instructions / patch_agent_instructions
│                           # + OpenInference VertexAIInstrumentor
├── gemini/                 # LLM-as-judge
│   └── judge.py            # judge_trace(ev, model) → JudgeVerdict
├── wa/                     # Worker Agent (background service)
│   ├── broadcaster.py      # WebSocket fan-out
│   ├── worker.py           # WorkerAgent (manual heal entrypoint)
│   └── scheduler.py        # Cost-spike + token-budget enforcer
├── .env.example            # ALL env vars documented
└── requirements.txt
```

## REST API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness + MCP/Vertex state |
| `GET` | `/api/agents` | List agents |
| `POST` | `/api/agents` | Register a new agent |
| `POST` | `/api/agents/:id/toggle` | Pause/resume loop detection |
| `POST` | `/api/agents/:id/pause` | Pause |
| `POST` | `/api/agents/:id/resume` | Resume |
| `GET` | `/api/traces?limit=100` | Recent spans |
| `GET` | `/api/traces/agent/:id` | Spans for one agent |
| `GET` | `/api/heals` | Recent auto-heal events |
| `GET` | `/api/heals/log` | Same, aliased for the dashboard |
| `GET` | `/api/heals/:id` | One heal |
| `POST` | `/api/heals/trigger` | Force a manual heal (operator panic button) |
| `GET` | `/api/settings` | Behavioral settings |
| `POST` | `/api/settings` | Update settings |
| `PUT` | `/api/settings` | Update settings (canonical) |
| `GET` | `/api/integrations` | Masked key metadata |
| `POST` | `/api/integrations/:provider/rotate` | Server-side key rotation |
| `POST` | `/api/integrations/webhook/arize` | Arize MCP webhook |
| `WS` | `/ws` | Real-time stream of spans / heals / settings |

## WebSocket envelope

```json
{ "type": "span" | "heal" | "loop_detected" | "settings_updated" | "hello" | "error",
  "data": { ... } }
```

## Run locally

```bash
cd backend
cp .env.example .env       # fill in real keys (Arize, GCP, Gemini)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Then point the frontend at it:

```bash
# /frontend/.env
VITE_API_BASE=http://localhost:8000/api
VITE_WS_BASE=ws://localhost:8000/ws
```

## Hackathon requirements — compliance

- [x] **OpenInference instrumentation for Vertex AI.** `vertex/client.py`
      installs `openinference.instrumentation.vertexai.VertexAIInstrumentor`
      so every call to `invoke_agent` / `patch_agent_instructions` emits a
      span into Arize Phoenix automatically.
- [x] **Code-owned Vertex AI runtime.** We use `google-cloud-aiplatform`
      directly (not the Agent Builder GUI). Agents are invoked and patched
      via SDK calls.
- [x] **.env.example lists every required env var.** Includes
      `GCP_PROJECT_ID`, `GCP_LOCATION`, `AGENT_ID`, `ARIZE_API_KEY`,
      `PHOENIX_URL`.
- [x] **CORS locked to the frontend origin.**
