# AEGIS Sentinel

> Autonomous oversight for Google Cloud Vertex AI agents.
> Built for the **Google Cloud x Arize MCP Hackathon**.

AEGIS watches every span your agent emits via Arize Phoenix MCP, detects
runaway tool-call loops, and **rewrites the agent's system instructions in
place** using the GCP Vertex AI SDK — atomically, in milliseconds, with
zero-downtime.

```
[ Vertex AI Agent ]
   │  OpenInference OTLP
   ▼
[ Arize Phoenix MCP ] ── stream ──▶ [ AEGIS FastAPI backend ]
                                          │  (heuristic + Gemini judge)
                                          ▼
                                   [ Vertex AI SDK patch ]
                                          │
                                          ▼  WebSocket
                                   [ React Dashboard ]
```

## Repository layout

```
.
├── frontend/        # React + Vite + Tailwind dashboard (this runtime)
│   └── src/
│       ├── lib/api.ts          # ONLY place the frontend talks to the network
│       ├── components/dashboard/
│       │   ├── AgentsTab.tsx   # /dashboard/agents
│       │   ├── SettingsTab.tsx # /dashboard/settings
│       │   └── ...
│       └── pages/              # /features /demo /architecture /docs /about /contact
└── backend/         # Python FastAPI (separate, isolated)
    ├── main.py
    ├── config.py
    ├── routers/    # /api/agents, /api/traces, /api/settings, /api/integrations
    ├── mcp/        # Arize Phoenix MCP client + LoopDetector + worker
    ├── vertex/     # Vertex AI Agent Builder SDK wrapper
    ├── gemini/     # Gemini trace judge
    ├── ws/         # /ws/dashboard broadcaster
    └── .env.example
```

## Security contract (NON-NEGOTIABLE)

1. **Zero-trust frontend.** The React app NEVER calls Arize, Google Cloud,
   or any external service. It ONLY talks to the FastAPI backend via
   `src/lib/api.ts`.
2. **Secrets live in `/backend/.env` only.** The browser never sees a real
   key. `GET /api/integrations` returns only masked metadata
   (e.g. `arize_phx_••••••••••3a91`).
3. **CORS is locked** to the frontend origin (`CORS_ORIGINS` env var).
4. **Rotate is server-side.** `POST /api/integrations/:provider/rotate`
   mints a new key, writes it to `.env`, prints it once to server stdout,
   and returns only the new masked meta. The plaintext is never sent over
   HTTP.

## Routes (frontend)

| Path | Page |
|---|---|
| `/` | Landing |
| `/features` | Capabilities (standalone) |
| `/demo` | Interactive loop-detection demo |
| `/architecture` | Architecture diagram + 4-step heal sequence |
| `/docs` | Install guide |
| `/about` | Project info |
| `/contact` | Contact info |
| `/dashboard` | Overview |
| `/dashboard/traces` | Live spans |
| `/dashboard/heal` | Auto-heal log |
| `/dashboard/playground` | Config Playground (chat + live editor) |
| `/dashboard/agents` | Agent roster + pause/resume |
| `/dashboard/settings` | Behavioral config + masked integrations |

## API surface (backend)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness |
| `GET` | `/api/agents` | List agents |
| `POST` | `/api/agents/:id/pause` | Pause loop detection |
| `POST` | `/api/agents/:id/resume` | Resume loop detection |
| `GET` | `/api/traces` | Recent spans |
| `GET` | `/api/heals` | Recent heals |
| `GET` | `/api/settings` | Behavioral settings |
| `PUT` | `/api/settings` | Update settings |
| `GET` | `/api/integrations` | Masked key metadata |
| `POST` | `/api/integrations/:provider/rotate` | Server-side key rotation |
| `WS` | `/ws/dashboard` | Live stream of spans + heals |

## Run locally

```bash
# Backend
cd backend
cp .env.example .env       # fill in real keys (Arize, GCP, Gemini)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (this Vite project, in another terminal)
npm install
npm run dev
```

Then open the URL Vite prints (default: http://localhost:5173).

The dashboard calls `/api/*` and `/ws/dashboard` on the backend. If the
backend is offline, every method in `src/lib/api.ts` falls back to a
deterministic in-memory mock so the UI is fully demo-able.
