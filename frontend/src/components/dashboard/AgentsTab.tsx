import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Pause,
  Play,
  RefreshCw,
  Search,
  Activity,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Plus,
} from "lucide-react";
import { Badge, Button, Dot, cn } from "../ui/Primitives";
import { fetchAgents, pauseAgent, resumeAgent, type Agent } from "../../lib/api";

/**
 * Agents tab — the operator's view of every Vertex AI agent under AEGIS's care.
 *
 * SECURITY: This component ONLY calls /api/agents/* via src/lib/api.ts. It never
 * touches GCP, Arize, or any external service directly. All heavy lifting
 * happens in the FastAPI backend.
 */

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function relative(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function StatusBadge({ status }: { status: Agent["status"] }) {
  if (status === "healthy")
    return (
      <Badge tone="emerald">
        <CheckCircle2 className="h-3 w-3" /> healthy
      </Badge>
    );
  if (status === "warning")
    return (
      <Badge tone="amber">
        <AlertTriangle className="h-3 w-3" /> warning
      </Badge>
    );
  if (status === "healing")
    return (
      <Badge tone="arize">
        <Loader2 className="h-3 w-3 animate-spin" /> healing
      </Badge>
    );
  return (
    <Badge tone="neutral">
      <Pause className="h-3 w-3" /> paused
    </Badge>
  );
}

function statusDot(status: Agent["status"]) {
  if (status === "healthy") return <Dot tone="emerald" />;
  if (status === "warning") return <Dot tone="amber" />;
  if (status === "healing") return <Dot tone="arize" />;
  return <Dot tone="ink" />;
}

export default function AgentsTab() {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    const data = await fetchAgents();
    setAgents(data);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggle(a: Agent) {
    setBusy(a.id);
    try {
      const next = a.status === "paused" ? await resumeAgent(a.id) : await pauseAgent(a.id);
      setAgents((cur) => cur?.map((x) => (x.id === next.id ? next : x)) ?? cur);
    } finally {
      setBusy(null);
    }
  }

  const filtered =
    agents?.filter((a) =>
      `${a.name} ${a.model} ${a.region} ${a.owner}`
        .toLowerCase()
        .includes(query.toLowerCase())
    ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone="arize">Monitor</Badge>
            <Badge tone="neutral">{agents?.length ?? 0} agents</Badge>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            <span className="wordmark-aegis text-white">AEGIS</span> · Agent Roster
          </h2>
          <p className="mt-1 text-sm text-ink-300">
            Every GCP Vertex AI agent under AEGIS's care. Pause to freeze loop
            detection, resume to re-arm.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[12px] text-ink-300">
            <Search className="h-3.5 w-3.5" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter agents…"
              className="w-44 bg-transparent text-ink-100 placeholder:text-ink-400 focus:outline-none"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={load} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
          <Button size="sm" glow>
            <Plus className="h-3.5 w-3.5" /> Register agent
          </Button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          {
            l: "Total agents",
            v: agents?.length ?? 0,
            i: <Cpu className="h-3.5 w-3.5 text-arize-300" />,
          },
          {
            l: "Healthy",
            v: agents?.filter((a) => a.status === "healthy").length ?? 0,
            i: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
          },
          {
            l: "Healing now",
            v: agents?.filter((a) => a.status === "healing" || a.status === "warning").length ?? 0,
            i: <ShieldAlert className="h-3.5 w-3.5 text-rose-300" />,
          },
          {
            l: "Paused",
            v: agents?.filter((a) => a.status === "paused").length ?? 0,
            i: <Pause className="h-3.5 w-3.5 text-ink-300" />,
          },
        ].map((s) => (
          <div
            key={s.l}
            className="rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80 p-4"
          >
            <div className="flex items-center justify-between text-[10.5px] font-mono uppercase tracking-[0.16em] text-ink-300">
              <span>{s.l}</span>
              {s.i}
            </div>
            <div className="mt-1.5 font-mono text-2xl font-semibold text-white">{s.v}</div>
          </div>
        ))}
      </div>

      {/* Agent list */}
      <div className="overflow-hidden rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80">
        <div className="hidden grid-cols-12 border-b border-white/[0.06] px-5 py-3 text-[10.5px] font-mono uppercase tracking-[0.16em] text-ink-300 md:grid">
          <div className="col-span-4">Agent</div>
          <div className="col-span-2">Model</div>
          <div className="col-span-2">Region</div>
          <div className="col-span-1 text-right">Spans</div>
          <div className="col-span-1 text-right">Err</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        <AnimatePresence initial={false}>
          {filtered.length === 0 && agents === null && (
            <li className="block list-none px-5 py-12 text-center text-sm text-ink-300">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-arize-300" />
              <p className="mt-2">Loading agents from FastAPI…</p>
            </li>
          )}
          {filtered.length === 0 && agents !== null && (
            <li className="block list-none px-5 py-12 text-center text-sm text-ink-300">
              No agents match "{query}".
            </li>
          )}
          {filtered.map((a) => (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-12 items-center gap-2 border-b border-white/[0.04] px-5 py-3.5 last:border-b-0 hover:bg-white/[0.02]"
            >
              <div className="col-span-12 md:col-span-4">
                <div className="flex items-center gap-2.5">
                  {statusDot(a.status)}
                  <span className="font-mono text-[13px] font-medium text-white">
                    {a.name}
                  </span>
                  <StatusBadge status={a.status} />
                </div>
                <div className="mt-1 text-[11px] text-ink-300">
                  <span className="font-mono">@{a.owner}</span>
                  <span className="mx-1.5 text-ink-500">·</span>
                  <span>last seen {relative(a.lastSeen)}</span>
                </div>
              </div>
              <div className="col-span-6 font-mono text-[12px] text-ink-200 md:col-span-2">
                {a.model}
              </div>
              <div className="col-span-6 font-mono text-[12px] text-cyan-200 md:col-span-2">
                {a.region}
              </div>
              <div className="col-span-6 text-right font-mono text-[12px] text-ink-200 md:col-span-1">
                {fmt(a.totalSpans)}
              </div>
              <div className="col-span-6 text-right font-mono text-[12px] md:col-span-1">
                <span
                  className={cn(
                    a.errorRate > 0.02 ? "text-rose-300" : a.errorRate > 0.005 ? "text-amber-300" : "text-emerald-300"
                  )}
                >
                  {(a.errorRate * 100).toFixed(2)}%
                </span>
              </div>
              <div className="col-span-12 flex items-center justify-end gap-2 md:col-span-2">
                <a
                  href={`#/dashboard/traces?agent=${a.id}`}
                  className="rounded-md border border-white/[0.06] bg-white/[0.02] p-1.5 text-ink-200 transition-colors hover:bg-white/[0.05] hover:text-white"
                  title="View traces"
                >
                  <Activity className="h-3.5 w-3.5" />
                </a>
                <Button
                  size="sm"
                  variant={a.status === "paused" ? "primary" : "secondary"}
                  onClick={() => handleToggle(a)}
                  disabled={busy === a.id}
                >
                  {busy === a.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : a.status === "paused" ? (
                    <Play className="h-3 w-3" />
                  ) : (
                    <Pause className="h-3 w-3" />
                  )}
                  {a.status === "paused" ? "Resume" : "Pause"}
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="rounded-xl border border-arize-400/15 bg-arize-500/[0.04] p-4 text-[12.5px] text-arize-100">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 text-arize-300" />
          <p>
            <span className="font-medium text-white">AEGIS does not run your agents.</span>{" "}
            Pause / resume tells the AEGIS oversight engine to stop or restart
            loop detection for that agent. To re-deploy or modify the agent
            itself, use the GCP Vertex AI console.
          </p>
        </div>
      </div>
    </div>
  );
}
