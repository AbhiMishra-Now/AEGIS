import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import {
  Filter,
  Pause,
  Play,
  Search,
  Download,
  ChevronRight,
  Activity,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Wand2,
} from "lucide-react";
import { Badge, Dot } from "../ui/Primitives";
import { useRealtime } from "./RealtimeContext";
import type { SpanStatus } from "../../lib/mockData";
import { cn } from "../../utils/cn";

const filters: { k: SpanStatus | "all"; label: string; tone: string; dot?: string }[] = [
  { k: "all", label: "All", tone: "text-ink-100" },
  { k: "success", label: "Success", tone: "text-emerald-400", dot: "bg-emerald-400" },
  { k: "warning", label: "High latency", tone: "text-amber-400", dot: "bg-amber-400" },
  { k: "error", label: "Loop", tone: "text-rose-400", dot: "bg-rose-400" },
  { k: "healing", label: "Healing", tone: "text-arize-200", dot: "bg-arize-400" },
];

function StatusIcon({ status }: { status: SpanStatus }) {
  if (status === "success")
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
  if (status === "warning")
    return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
  if (status === "error")
    return <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />;
  return <Wand2 className="h-3.5 w-3.5 text-arize-300" />;
}

function fmt(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

export default function LiveTracesTab() {
  const { spans, connected } = useRealtime();
  const [filter, setFilter] = useState<SpanStatus | "all">("all");
  const [paused, setPaused] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(spans[0]?.id ?? null);

  const filtered = useMemo(() => {
    return spans.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (
        query &&
        !`${s.agent} ${s.model} ${s.summary} ${s.tool ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
        return false;
      return true;
    });
  }, [spans, filter, query]);

  const active = filtered.find((s) => s.id === selected) ?? filtered[0];

  return (
    <div className="grid h-[calc(100vh-9rem)] grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
      {/* Stream column */}
      <div className="flex min-h-0 flex-col rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80">
        <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-ink-300">
              <Dot tone={connected ? "emerald" : "amber"} />
              {connected ? "streaming" : "connecting"}
            </div>
            <Badge tone="neutral">{filtered.length} spans</Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[12px] text-ink-300 md:flex">
              <Search className="h-3.5 w-3.5" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter…"
                className="w-44 bg-transparent text-ink-100 placeholder:text-ink-400 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setPaused((p) => !p)}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[12px] text-ink-200 hover:bg-white/[0.05]"
            >
              {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              {paused ? "Resume" : "Pause"}
            </button>
            <button className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[12px] text-ink-200 hover:bg-white/[0.05]">
              <Download className="h-3 w-3" /> Export
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 border-b border-white/[0.06] p-2.5">
          <Filter className="ml-1 h-3.5 w-3.5 text-ink-300" />
          {filters.map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11.5px] transition-colors",
                filter === f.k
                  ? "border-arize-400/30 bg-arize-500/10 text-arize-100"
                  : "border-white/[0.06] bg-white/[0.015] text-ink-200 hover:bg-white/[0.04]"
              )}
            >
              {f.dot && <span className={cn("h-1.5 w-1.5 rounded-full", f.dot)} />}
              {f.label}
            </button>
          ))}
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          {paused && (
            <div className="m-3 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-1.5 text-[11.5px] text-amber-200">
              Stream paused — new spans are queued. Click Resume to continue.
            </div>
          )}
          <ul>
            <AnimatePresence initial={false}>
              {filtered.map((s) => (
                <motion.li
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => setSelected(s.id)}
                  className={cn(
                    "group flex cursor-pointer items-center gap-3 border-b border-white/[0.04] px-4 py-3 transition-colors",
                    s.id === active?.id
                      ? "bg-arize-500/[0.06]"
                      : "hover:bg-white/[0.02]"
                  )}
                >
                  <div className="w-24 shrink-0 font-mono text-[11px] text-ink-300">
                    {new Date(s.ts).toLocaleTimeString("en-US", { hour12: false }) +
                      "." +
                      String(s.ts % 1000).padStart(3, "0")}
                  </div>
                  <div className="flex w-32 shrink-0 items-center gap-1.5">
                    <StatusIcon status={s.status} />
                    <span className="font-mono text-[12px] text-arize-200">{s.agent}</span>
                  </div>
                  <div className="hidden w-36 shrink-0 font-mono text-[11.5px] text-ink-300 md:block">
                    {s.model}
                  </div>
                  {s.tool && (
                    <span className="hidden rounded-md border border-white/[0.06] bg-white/[0.02] px-1.5 py-0.5 font-mono text-[10.5px] text-cyan-300 md:inline-block">
                      {s.tool}
                    </span>
                  )}
                  <div className="min-w-0 flex-1 truncate text-[12.5px] text-ink-100">
                    {s.summary}
                  </div>
                  <div className="hidden w-20 text-right font-mono text-[11.5px] text-ink-200 md:block">
                    {fmt(s.tokens)}t
                  </div>
                  <div className="hidden w-20 text-right font-mono text-[11.5px] text-ink-200 md:block">
                    {s.latencyMs}ms
                  </div>
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 text-ink-400 transition-transform",
                      s.id === active?.id && "translate-x-0.5 text-arize-300"
                    )}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <li className="p-10 text-center text-sm text-ink-300">
                No spans match your filter.
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Detail column */}
      <aside className="flex min-h-0 flex-col rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80">
        {active ? (
          <>
            <div className="border-b border-white/[0.06] p-4">
              <div className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-ink-300">
                Span detail
              </div>
              <div className="mt-1 flex items-center gap-2">
                <StatusIcon status={active.status} />
                <h3 className="font-mono text-[14px] font-semibold text-white">
                  {active.agent}
                </h3>
                <Badge
                  tone={
                    active.status === "success"
                      ? "emerald"
                      : active.status === "warning"
                      ? "amber"
                      : active.status === "error"
                      ? "rose"
                      : "arize"
                  }
                >
                  {active.status}
                </Badge>
              </div>
              <div className="mt-1 font-mono text-[11px] text-ink-400">{active.id}</div>
            </div>
            <div className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-[12.5px]">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { l: "Model", v: active.model },
                  { l: "Tool", v: active.tool ?? "—" },
                  { l: "Tokens", v: fmt(active.tokens) },
                  { l: "Latency", v: active.latencyMs + "ms" },
                  { l: "Cost", v: "$" + active.cost.toFixed(5) },
                  { l: "Time", v: new Date(active.ts).toLocaleTimeString() },
                ].map((x) => (
                  <div
                    key={x.l}
                    className="rounded-lg border border-white/[0.05] bg-white/[0.015] p-2.5"
                  >
                    <div className="text-[10px] font-mono uppercase tracking-wider text-ink-400">
                      {x.l}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-white">{x.v}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="mb-1.5 text-[10.5px] font-mono uppercase tracking-[0.16em] text-ink-300">
                  Summary
                </div>
                <div className="rounded-lg border border-white/[0.05] bg-ink-900/60 p-3 text-ink-100">
                  {active.summary}
                </div>
              </div>

              {active.status === "error" && (
                <div className="rounded-xl border border-rose-400/20 bg-rose-500/[0.04] p-3">
                  <div className="flex items-center gap-2 text-rose-200">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span className="text-[12px] font-semibold">Sentinel noticed this</span>
                  </div>
                  <p className="mt-1 text-[11.5px] text-rose-100/80">
                    Detected {Math.floor(Math.random() * 5) + 3} identical tool calls in{" "}
                    {Math.floor(active.latencyMs / 4)}ms. Patching the system prompt…
                  </p>
                  <a
                    href="#/dashboard/heal"
                    className="mt-2 inline-block text-[11.5px] font-medium text-rose-200 underline-offset-2 hover:underline"
                  >
                    View auto-heal log →
                  </a>
                </div>
              )}

              <div>
                <div className="mb-1.5 text-[10.5px] font-mono uppercase tracking-[0.16em] text-ink-300">
                  Raw event
                </div>
                <pre className="scrollbar-thin overflow-x-auto rounded-lg border border-white/[0.05] bg-ink-950/60 p-3 font-mono text-[11.5px] leading-relaxed text-ink-200">
{JSON.stringify(active, null, 2)}
                </pre>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-ink-300">
            <div className="text-center">
              <Activity className="mx-auto h-6 w-6 text-ink-400" />
              <p className="mt-2 text-sm">Select a span to inspect.</p>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
