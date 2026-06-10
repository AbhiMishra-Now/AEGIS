// Centralized mock data + simulation logic for the demo experience.
// In production this is replaced by FastAPI WebSocket payloads from
// the Sentinel agent.

export type SpanStatus = "success" | "warning" | "error" | "healing";

export interface TraceSpan {
  id: string;
  ts: number;
  agent: string;
  model: string;
  tool?: string;
  status: SpanStatus;
  tokens: number;
  cost: number;
  latencyMs: number;
  summary: string;
}

export interface HealEvent {
  id: string;
  ts: number;
  agent: string;
  reason: string;
  loopCount: number;
  wastedTokens: number;
  wastedUsd: number;
  beforePrompt: string;
  afterPrompt: string;
  diffHighlights: { from: string; to: string }[];
}

export interface MetricPoint {
  t: number;
  tokensSaved: number;
  loopsIntercepted: number;
  cost: number;
  latency: number;
}

const AGENTS = ["support-bot", "research-agent", "data-pipeline", "router-α", "router-β"];
const MODELS = ["gemini-2.0-flash", "gemini-2.5-pro", "claude-sonnet-4", "gpt-4o-mini"];
const TOOLS = ["web_search", "sql_query", "kb_lookup", "calculator", "send_email", "file_read"];

const SUMMARIES = [
  "Resolved refund query",
  "Polled CRM every 240ms — no state change",
  "Synthesized 4 sources",
  "Loop detected: web_search('invisible apple')",
  "Routed ticket to billing queue",
  "Generated SQL for monthly cohort",
  "Refused unsafe prompt",
  "Loop detected: kb_lookup('quantum banana')",
  "Healed: tightened search policy",
  "Computed CTR for 12 campaigns",
  "Streamed partial response",
  "Latency spike: cold cache",
  "Loop detected: calculator(0/0)",
  "Verified OTP successfully",
];

export function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

let spanCounter = 0;
export function generateSpan(): TraceSpan {
  spanCounter++;
  const r = Math.random();
  let status: SpanStatus = "success";
  if (r < 0.55) status = "success";
  else if (r < 0.75) status = "warning";
  else if (r < 0.92) status = "error";
  else status = "healing";
  const tokens = status === "error" ? 1200 + Math.floor(Math.random() * 4000) : 80 + Math.floor(Math.random() * 900);
  return {
    id: `span_${Date.now()}_${spanCounter}`,
    ts: Date.now(),
    agent: pick(AGENTS),
    model: pick(MODELS),
    tool: status === "error" || status === "warning" ? pick(TOOLS) : undefined,
    status,
    tokens,
    cost: tokens * 0.0000035,
    latencyMs:
      status === "error" ? 1200 + Math.floor(Math.random() * 3200) : 120 + Math.floor(Math.random() * 900),
    summary: pick(SUMMARIES),
  };
}

export const INITIAL_HEAL_EVENTS: HealEvent[] = [
  {
    id: "heal_001",
    ts: Date.now() - 1000 * 60 * 4,
    agent: "research-agent",
    reason: "Recursive web_search with identical query for >3 iterations",
    loopCount: 7,
    wastedTokens: 14820,
    wastedUsd: 0.0519,
    beforePrompt:
      "You are a research agent. Use the web_search tool to find information about the user's question. Be thorough and check multiple sources.",
    afterPrompt:
      "You are a research agent. Use the web_search tool exactly once per distinct sub-question. If a search returns no relevant result, reformulate ONCE then escalate to the user. Never repeat a previously issued query string.",
    diffHighlights: [
      { from: "Use the web_search tool to find information", to: "Use the web_search tool exactly once per distinct sub-question" },
      { from: "Be thorough and check multiple sources", to: "Never repeat a previously issued query string" },
    ],
  },
  {
    id: "heal_002",
    ts: Date.now() - 1000 * 60 * 32,
    agent: "support-bot",
    reason: "Tool call latency exceeded p99 threshold (12.4s)",
    loopCount: 0,
    wastedTokens: 6210,
    wastedUsd: 0.0217,
    beforePrompt:
      "You are a friendly support agent. Help the user with their issue. You may use the kb_lookup tool when appropriate.",
    afterPrompt:
      "You are a friendly support agent. Help the user with their issue. Use kb_lookup with a single, specific query. If the lookup times out, return a polite fallback message — do not retry automatically.",
    diffHighlights: [
      { from: "You may use the kb_lookup tool when appropriate", to: "Use kb_lookup with a single, specific query" },
    ],
  },
  {
    id: "heal_003",
    ts: Date.now() - 1000 * 60 * 86,
    agent: "data-pipeline",
    reason: "Repeated calculator(0/0) — 12 invocations in 4.2s",
    loopCount: 12,
    wastedTokens: 9840,
    wastedUsd: 0.0344,
    beforePrompt:
      "You are a data pipeline agent. Compute values using the calculator tool when the user asks numerical questions.",
    afterPrompt:
      "You are a data pipeline agent. Use the calculator tool only for non-trivial expressions. Validate inputs mentally before calling — reject divide-by-zero with a clear explanation rather than retrying.",
    diffHighlights: [
      { from: "Compute values using the calculator tool when the user asks", to: "Use the calculator tool only for non-trivial expressions" },
      { from: "numerical questions", to: "Validate inputs mentally — reject divide-by-zero with a clear explanation" },
    ],
  },
];

export function generateMetricHistory(minutes = 60): MetricPoint[] {
  const out: MetricPoint[] = [];
  let tokensSaved = 12000;
  let loopsIntercepted = 4;
  for (let i = minutes; i >= 0; i--) {
    tokensSaved += Math.floor(Math.random() * 1200);
    if (Math.random() < 0.08) loopsIntercepted += 1;
    out.push({
      t: Date.now() - i * 60_000,
      tokensSaved,
      loopsIntercepted,
      cost: 80 + Math.random() * 40,
      latency: 400 + Math.random() * 600,
    });
  }
  return out;
}

export const INITIAL_SPANS: TraceSpan[] = Array.from({ length: 12 }, () => {
  const s = generateSpan();
  s.ts = Date.now() - Math.floor(Math.random() * 60_000);
  return s;
}).sort((a, b) => b.ts - a.ts);

export const SYSTEM_PROMPT_INITIAL = `You are a research agent for a knowledge platform.

# Tools
- web_search(query: string)
- kb_lookup(query: string)
- calculator(expression: string)

# Behavior
- Be thorough and answer the user's question completely.
- Use the web_search tool to gather information from the internet.
- You can call tools multiple times to refine your answer.
- Always double-check your work before responding.`;

export const SYSTEM_PROMPT_HEALED = `You are a research agent for a knowledge platform.

# Tools
- web_search(query: string)   // max 1 call per distinct sub-question
- kb_lookup(query: string)    // max 1 call, 4s timeout
- calculator(expression: string)

# Behavior
- Plan your tool calls in one batch, then answer.
- NEVER repeat an identical tool call — check your history first.
- If a tool returns nothing useful, reformulate ONCE then respond with what you know.
- Refuse to keep searching for a clearly impossible object.
- Keep final answers under 200 words unless asked for more.`;

export function diffSummary(before: string, after: string) {
  const a = before.split(/\s+/);
  const b = after.split(/\s+/);
  const aSet = new Set(a);
  const bSet = new Set(b);
  const removed = a.filter((w) => !bSet.has(w));
  const added = b.filter((w) => !aSet.has(w));
  return { removed, added };
}
