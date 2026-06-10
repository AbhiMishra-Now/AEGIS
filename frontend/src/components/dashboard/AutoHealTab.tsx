import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitCommit,
  GitBranch,
  RotateCcw,
  ShieldAlert,
  Coins,
  Wand2,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "../ui/Primitives";
import { useRealtime } from "./RealtimeContext";
import { cn } from "../../utils/cn";
import type { HealEvent } from "../../lib/mockData";

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function timeAgo(ts: number) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function DiffView({ before, after }: { before: string; after: string }) {
  const aLines = before.split("\n");
  const bLines = after.split("\n");
  const max = Math.max(aLines.length, bLines.length);
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="overflow-hidden rounded-xl border border-rose-400/20 bg-rose-500/[0.04]">
        <div className="flex items-center gap-2 border-b border-rose-400/15 px-3 py-1.5 text-[10.5px] font-mono uppercase tracking-wider text-rose-200">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> system_prompt · v(n)
        </div>
        <pre className="scrollbar-thin max-h-80 overflow-auto p-3 font-mono text-[12px] leading-relaxed text-ink-200">
          {Array.from({ length: max }).map((_, i) => {
            const line = aLines[i] ?? "";
            const isInB = bLines.includes(line);
            return (
              <div
                key={i}
                className={cn(
                  "flex gap-3 px-1",
                  !isInB && line.trim() && "bg-rose-400/[0.08] text-rose-200"
                )}
              >
                <span className="w-5 text-right text-ink-500">{i + 1}</span>
                <span className={cn(!isInB && line.trim() && "line-through opacity-80")}>
                  {line || " "}
                </span>
              </div>
            );
          })}
        </pre>
      </div>
      <div className="overflow-hidden rounded-xl border border-emerald-400/20 bg-emerald-500/[0.04]">
        <div className="flex items-center gap-2 border-b border-emerald-400/15 px-3 py-1.5 text-[10.5px] font-mono uppercase tracking-wider text-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> system_prompt · v(n+1)
        </div>
        <pre className="scrollbar-thin max-h-80 overflow-auto p-3 font-mono text-[12px] leading-relaxed text-ink-200">
          {Array.from({ length: max }).map((_, i) => {
            const line = bLines[i] ?? "";
            const isInA = aLines.includes(line);
            return (
              <div
                key={i}
                className={cn(
                  "flex gap-3 px-1",
                  !isInA && line.trim() && "bg-emerald-400/[0.08] text-emerald-200"
                )}
              >
                <span className="w-5 text-right text-ink-500">{i + 1}</span>
                <span className={cn(!isInA && line.trim() && "font-medium")}>
                  {line || " "}
                </span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}

function TimelineRow({
  h,
  active,
  onClick,
  isLast,
}: {
  h: HealEvent;
  active: boolean;
  onClick: () => void;
  isLast: boolean;
}) {
  return (
    <li className="relative pl-10">
      {/* rail */}
      <div className="absolute left-3.5 top-0 h-full w-px bg-gradient-to-b from-arize-500/40 via-white/[0.06] to-transparent" />
      {!isLast && (
        <div className="absolute left-3.5 top-3.5 h-[calc(100%-0.875rem)] w-px bg-white/[0.04]" />
      )}
      {/* node */}
      <div
        className={cn(
          "absolute left-0 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border bg-ink-900",
          active
            ? "border-arize-400/60 text-arize-200 shadow-[0_0_20px_-2px_rgba(138,99,255,0.5)]"
            : "border-white/10 text-ink-300"
        )}
      >
        <ShieldAlert className="h-3.5 w-3.5" />
      </div>

      <button
        onClick={onClick}
        className={cn(
          "group block w-full rounded-xl border p-3.5 text-left transition-all",
          active
            ? "border-arize-400/30 bg-arize-500/[0.05]"
            : "border-white/[0.05] bg-white/[0.015] hover:border-white/10 hover:bg-white/[0.03]"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12.5px] text-arize-200">{h.agent}</span>
            <Badge tone="rose">{h.loopCount}× loop</Badge>
          </div>
          <span className="font-mono text-[10.5px] text-ink-400">{timeAgo(h.ts)}</span>
        </div>
        <div className="mt-1 line-clamp-1 text-[12px] text-ink-200">{h.reason}</div>
        <div className="mt-2 flex items-center justify-between text-[10.5px]">
          <span className="font-mono text-rose-200">−{fmt(h.wastedTokens)}t</span>
          <span className="flex items-center gap-1 font-mono text-ink-300">
            <Coins className="h-3 w-3" /> ${h.wastedUsd.toFixed(4)}
          </span>
        </div>
      </button>
    </li>
  );
}

export default function AutoHealTab() {
  const { heals } = useRealtime();
  const [activeId, setActiveId] = useState<string>(heals[0]?.id ?? "");
  const active = heals.find((h) => h.id === activeId) ?? heals[0];

  return (
    <div className="grid h-[calc(100vh-9rem)] grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
      {/* Timeline */}
      <div className="flex min-h-0 flex-col rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80">
        <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
          <div>
            <div className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-ink-300">
              Auto-heal log
            </div>
            <div className="mt-0.5 text-[13px] font-semibold text-white">
              {heals.length} interventions today
            </div>
          </div>
          <Badge tone="emerald">
            <CheckCircle2 className="h-3 w-3" /> 100% recovered
          </Badge>
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4">
          <ul className="space-y-3">
            {heals.map((h, i) => (
              <TimelineRow
                key={h.id}
                h={h}
                active={h.id === active?.id}
                onClick={() => setActiveId(h.id)}
                isLast={i === heals.length - 1}
              />
            ))}
          </ul>
        </div>
      </div>

      {/* Detail */}
      <div className="flex min-h-0 flex-col rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80">
        <AnimatePresence mode="wait">
          {active && (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex items-start justify-between border-b border-white/[0.06] p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone="arize">
                      <Wand2 className="h-3 w-3" /> heal · {active.id}
                    </Badge>
                    <span className="font-mono text-[11px] text-ink-400">
                      {new Date(active.ts).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-white">
                    <span className="wordmark-aegis text-white">AEGIS</span> patched{" "}
                    <span className="font-mono text-arize-200">{active.agent}</span>
                  </h3>
                  <p className="mt-1 max-w-2xl text-[13px] text-ink-200">{active.reason}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[12px] text-ink-200 hover:bg-white/[0.05]">
                    <RotateCcw className="h-3 w-3" /> Roll back
                  </button>
                  <button className="flex items-center gap-1.5 rounded-lg bg-arize-500/15 px-2.5 py-1.5 text-[12px] text-arize-100 hover:bg-arize-500/20">
                    <GitCommit className="h-3 w-3" /> View commit
                  </button>
                </div>
              </div>

              <div className="scrollbar-thin min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    { l: "Wasted tokens", v: fmt(active.wastedTokens), tone: "text-rose-200" },
                    { l: "Cost avoided", v: "$" + active.wastedUsd.toFixed(4), tone: "text-emerald-300" },
                    { l: "Loop count", v: active.loopCount.toString(), tone: "text-amber-300" },
                    { l: "Heal latency", v: "623ms", tone: "text-cyan-300" },
                  ].map((s) => (
                    <div
                      key={s.l}
                      className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-3"
                    >
                      <div className="text-[10.5px] font-mono uppercase tracking-wider text-ink-400">
                        {s.l}
                      </div>
                      <div className={cn("mt-0.5 font-mono text-lg font-semibold", s.tone)}>
                        {s.v}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-[0.16em] text-ink-300">
                    <GitBranch className="h-3.5 w-3.5" />
                    Prompt diff · system_prompt.yml
                  </div>
                  <DiffView before={active.beforePrompt} after={active.afterPrompt} />
                </div>

                <div>
                  <div className="mb-2 text-[10.5px] font-mono uppercase tracking-[0.16em] text-ink-300">
                    Why this worked
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-ink-900/60 p-4 text-[13px] leading-relaxed text-ink-100">
                    AEGIS's Sentinel identified that the agent was issuing identical tool calls
                    without checking its own message history. The rewrite enforces
                    single-shot tool use and a hard ceiling on retry count, eliminating
                    the runaway pattern while preserving legitimate research behavior.
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
