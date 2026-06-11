/**
 * Frontend API service layer.
 *
 * SECURITY CONTRACT:
 *   - This module is the ONLY place the frontend talks to "the network".
 *   - It MUST NOT call Arize, Google Cloud, or any third-party service directly.
 *   - All real API keys, MCP client init, and SDK calls live in the FastAPI backend
 *     at /backend (see /backend/main.py).
 *   - The backend ALWAYS returns masked values (e.g. "arize_****1234").
 *   - If the backend is unreachable, every method below falls back to a
 *     deterministic in-memory mock so the dashboard is fully demo-able offline.
 *
 * Endpoints (mirrored from the FastAPI router in /backend/main.py):
 *   GET    /api/agents
 *   POST   /api/agents/:id/pause
 *   POST   /api/agents/:id/resume
 *   GET    /api/traces
 *   GET    /api/heals
 *   GET    /api/settings
 *   PUT    /api/settings
 *   GET    /api/integrations        (returns MASKED key metadata only)
 *   POST   /api/integrations/rotate
 *   WS     /ws/dashboard
 */

const getApiBase = () => {
  const backendUrl = (import.meta as any).env?.NEXT_PUBLIC_BACKEND_URL;
  if (backendUrl) {
    const baseUrl = backendUrl.endsWith("/") ? backendUrl.slice(0, -1) : backendUrl;
    return `${baseUrl}/api`;
  }
  return (import.meta as any).env?.VITE_API_BASE ?? "/api";
};

const API_BASE = getApiBase();
const WS_BASE = (import.meta as any).env?.VITE_WS_BASE ?? "/ws";

/* ------------------------------ types --------------------------------- */
export interface Agent {
  id: string;
  name: string;
  model: string;
  region: string;
  status: "healthy" | "warning" | "paused" | "healing";
  totalSpans: number;
  errorRate: number;
  lastSeen: string;
  owner: string;
}

export interface ApiKeyMeta {
  /** Provider name, e.g. "arize", "gcp_vertex", "gemini_judge" */
  provider: string;
  /** Display name */
  label: string;
  /** ALWAYS masked. Never the real key. */
  maskedKey: string;
  /** ISO timestamp the key was last rotated, or null if never set */
  lastRotatedAt: string | null;
  /** Backend-managed env-var name, NEVER the value */
  envVar: string;
}

export interface BehavioralSettings {
  /** Heuristic loop threshold: same tool called N times within window */
  loopToolThreshold: number;
  /** Sliding window (seconds) for the loop heuristic */
  loopWindowSeconds: number;
  /** Whether the AEGIS engine is allowed to patch prompts without human approval */
  autoHealEnabled: boolean;
  /** Whether new heal events are pushed to the live WebSocket stream */
  liveStreamEnabled: boolean;
  /** Cost-spike threshold in USD per minute */
  costSpikeThreshold: number;
  /** Default Gemini model used as the trace judge */
  judgeModel: string;
  /** Default GCP project used for Vertex AI patches */
  defaultProject: string;
}

/* ----------------------------- mock store ----------------------------- */
const mockAgents: Agent[] = [
  {
    id: "research-agent",
    name: "research-agent",
    model: "gemini-2.5-pro",
    region: "us-central1",
    status: "warning",
    totalSpans: 18420,
    errorRate: 0.034,
    lastSeen: new Date(Date.now() - 1000 * 30).toISOString(),
    owner: "platform-eng",
  },
  {
    id: "support-bot",
    name: "support-bot",
    model: "gemini-2.0-flash",
    region: "us-east1",
    status: "healthy",
    totalSpans: 9204,
    errorRate: 0.008,
    lastSeen: new Date(Date.now() - 1000 * 5).toISOString(),
    owner: "support-eng",
  },
  {
    id: "data-pipeline",
    name: "data-pipeline",
    model: "gemini-2.5-pro",
    region: "europe-west4",
    status: "healing",
    totalSpans: 4080,
    errorRate: 0.012,
    lastSeen: new Date(Date.now() - 1000 * 90).toISOString(),
    owner: "data-eng",
  },
  {
    id: "router-α",
    name: "router-α",
    model: "claude-sonnet-4",
    region: "us-central1",
    status: "paused",
    totalSpans: 612,
    errorRate: 0.0,
    lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    owner: "platform-eng",
  },
  {
    id: "router-β",
    name: "router-β",
    model: "gpt-4o-mini",
    region: "us-central1",
    status: "healthy",
    totalSpans: 2108,
    errorRate: 0.002,
    lastSeen: new Date(Date.now() - 1000 * 12).toISOString(),
    owner: "platform-eng",
  },
];

const mockSettings: BehavioralSettings = {
  loopToolThreshold: 3,
  loopWindowSeconds: 10,
  autoHealEnabled: true,
  liveStreamEnabled: true,
  costSpikeThreshold: 0.5,
  judgeModel: "gemini-2.5-pro",
  defaultProject: "arize-hack-2024",
};

const mockKeys: ApiKeyMeta[] = [
  {
    provider: "arize",
    label: "Arize Phoenix MCP",
    maskedKey: "arize_phx_••••••••••3a91",
    lastRotatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
    envVar: "ARIZE_API_KEY",
  },
  {
    provider: "phoenix",
    label: "Phoenix Trace Store",
    maskedKey: "phx_••••••••••7b2c",
    lastRotatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
    envVar: "PHOENIX_URL",
  },
  {
    provider: "gcp_vertex",
    label: "Google Cloud Vertex AI",
    maskedKey: "ya29.••••••••••bT2k",
    lastRotatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    envVar: "GCP_SERVICE_ACCOUNT_JSON_PATH",
  },
  {
    provider: "gemini_judge",
    label: "Gemini Trace Judge",
    maskedKey: "AIzaSy••••••••••Qkz",
    lastRotatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 41).toISOString(),
    envVar: "GEMINI_API_KEY",
  },
];

/* ----------------------------- helpers -------------------------------- */
async function tryFetch<T>(path: string, init?: RequestInit, fallback?: T | (() => T)): Promise<T> {
  try {
    const res = await fetch(API_BASE + path, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    if (!res.ok) throw new Error("backend " + res.status);
    return (await res.json()) as T;
  } catch {
    // Backend offline — fall back to mock for offline demo
    await new Promise((r) => setTimeout(r, 220 + Math.random() * 180));
    if (typeof fallback === "function") return (fallback as () => T)();
    return fallback as T;
  }
}

/* ------------------------------ agents -------------------------------- */
export async function fetchAgents(): Promise<Agent[]> {
  return tryFetch<Agent[]>("/agents", undefined, () => mockAgents);
}

export async function pauseAgent(id: string): Promise<Agent> {
  const res = await tryFetch<any>(`/agents/${id}/pause`, { method: "POST" }, () => {
    const a = mockAgents.find((x) => x.id === id);
    if (!a) throw new Error("agent not found");
    a.status = "paused";
    return a;
  });
  return res && typeof res === "object" && "agent" in res ? res.agent : res;
}

export async function resumeAgent(id: string): Promise<Agent> {
  const res = await tryFetch<any>(`/agents/${id}/resume`, { method: "POST" }, () => {
    const a = mockAgents.find((x) => x.id === id);
    if (!a) throw new Error("agent not found");
    a.status = "healthy";
    a.lastSeen = new Date().toISOString();
    return a;
  });
  return res && typeof res === "object" && "agent" in res ? res.agent : res;
}

/* ----------------------------- settings ------------------------------- */
export async function fetchSettings(): Promise<BehavioralSettings> {
  return tryFetch<BehavioralSettings>("/settings", undefined, () => ({ ...mockSettings }));
}

export async function saveSettings(s: BehavioralSettings): Promise<BehavioralSettings> {
  return tryFetch<BehavioralSettings>("/settings", {
    method: "PUT",
    body: JSON.stringify(s),
  }, () => {
    Object.assign(mockSettings, s);
    return { ...mockSettings };
  });
}

/* -------------------------- integrations ------------------------------ */
export async function fetchIntegrations(): Promise<ApiKeyMeta[]> {
  return tryFetch<ApiKeyMeta[]>("/integrations", undefined, () => mockKeys);
}

/**
 * Rotate an API key.
 * SECURITY: the new key is NEVER returned to the frontend.
 * The backend will update /backend/.env and the response is the masked meta.
 */
export async function rotateIntegrationKey(provider: string): Promise<ApiKeyMeta> {
  const res = await tryFetch<any>(
    `/integrations/${provider}/rotate`,
    { method: "POST" },
    () => {
      const k = mockKeys.find((x) => x.provider === provider);
      if (!k) throw new Error("provider not found");
      k.lastRotatedAt = new Date().toISOString();
      // maskedKey intentionally unchanged in mock — backend would mint a new
      // key server-side and we only ever see the masked form.
      return k;
    }
  );
  return res && typeof res === "object" && "meta" in res ? res.meta : res;
}

/* ----------------------------- realtime ------------------------------- */
export function connectDashboardSocket(onMessage: (data: unknown) => void): () => void {
  let closed = false;
  let ws: WebSocket | null = null;
  let interval: number | null = null;
  try {
    const backendUrl = (import.meta as any).env?.NEXT_PUBLIC_BACKEND_URL;
    let wsUrl = "";
    if (backendUrl) {
      const url = new URL(backendUrl);
      const proto = url.protocol === "https:" ? "wss" : "ws";
      wsUrl = `${proto}://${url.host}/ws`;
    } else {
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      wsUrl = `${proto}://${window.location.host}${WS_BASE}`;
    }
    ws = new WebSocket(wsUrl);
    ws.onmessage = (e) => {
      try {
        onMessage(JSON.parse(e.data));
      } catch {
        onMessage(e.data);
      }
    };
    ws.onerror = () => {
      // Backend socket unavailable — start mock ticker
      if (closed) return;
      startMock();
    };
    ws.onclose = () => {
      if (closed) return;
      startMock();
    };
  } catch {
    startMock();
  }

  function startMock() {
    if (interval) return;
    interval = window.setInterval(() => {
      if (closed) return;
      onMessage({
        type: "span",
        data: {
          id: "mock_" + Date.now(),
          ts: Date.now(),
          agent: mockAgents[Math.floor(Math.random() * mockAgents.length)].id,
          status: Math.random() < 0.7 ? "success" : Math.random() < 0.5 ? "warning" : "error",
          tokens: 100 + Math.floor(Math.random() * 2000),
          latencyMs: 100 + Math.floor(Math.random() * 1500),
        },
      });
    }, 1800);
  }

  return () => {
    closed = true;
    if (ws) ws.close();
    if (interval) clearInterval(interval);
  };
}
