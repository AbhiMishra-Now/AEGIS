import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import {
  Coins,
  ShieldAlert,
  Cpu,
  TrendingUp,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Badge, Dot, Stat } from "../ui/Primitives";
import { useRealtime } from "./RealtimeContext";
import { useMemo } from "react";

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function Sparkline({ data, color = "#8a63ff" }: { data: number[]; color?: string }) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-12 w-full">
      <ResponsiveContainer>
        <AreaChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`g-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#g-${color})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function OverviewTab() {
  const { spans, heals, tokensSaved, loopsIntercepted, cost, connected } = useRealtime();

  const series = useMemo(() => {
    // Build a 30-point series
    const out: { i: number; v: number }[] = [];
    for (let i = 0; i < 30; i++) {
      out.push({ i, v: 100 + Math.sin(i / 2) * 30 + Math.random() * 18 + i * 1.5 });
    }
    return out;
  }, []);

  const recentHeals = heals.slice(0, 4);
  const recentSpans = spans.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Header strip */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone={connected ? "emerald" : "amber"}>
              <Dot tone={connected ? "emerald" : "amber"} />
              {connected ? "MCP stream live" : "connecting…"}
            </Badge>
            <Badge tone="neutral">last 60 minutes</Badge>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            <span className="wordmark-aegis text-white">AEGIS</span> · Good morning, Elena.
          </h2>
          <p className="mt-1 text-sm text-ink-300">
            <span className="wordmark-aegis text-arize-300">SENTINEL</span> intercepted{" "}
            <span className="text-white">{loopsIntercepted}</span> loops
            and saved <span className="text-emerald-400 font-mono">{fmt(tokensSaved)}</span>{" "}
            tokens in the last hour.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[12px] text-ink-200 transition-colors hover:bg-white/[0.05]">
            Export CSV
          </button>
          <button className="rounded-lg bg-gradient-to-b from-arize-500 to-arize-700 px-3 py-1.5 text-[12px] font-medium text-white shadow-[0_0_20px_-4px_rgba(138,99,255,0.6)]">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Run audit
            </span>
          </button>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Tokens Saved"
          value={fmt(tokensSaved)}
          delta={{ value: "+18.4%", positive: true }}
          icon={<Coins className="h-4 w-4" />}
          tone="emerald"
        />
        <Stat
          label="Loops Intercepted"
          value={loopsIntercepted.toString()}
          delta={{ value: "-6 vs yesterday" }}
          icon={<ShieldAlert className="h-4 w-4" />}
          tone="rose"
        />
        <Stat
          label="Active Agents"
          value="23"
          delta={{ value: "+2" }}
          icon={<Cpu className="h-4 w-4" />}
          tone="arize"
        />
        <Stat
          label="Heal Latency p50"
          value="623ms"
          delta={{ value: "-94ms" }}
          icon={<Wand2 className="h-4 w-4" />}
          tone="cyan"
        />
      </div>

      {/* Big chart + side panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-2 rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80 p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-ink-300">
                Spend (USD)
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="font-mono text-2xl font-semibold text-white">
                  ${cost.toFixed(2)}
                </div>
                <div className="text-xs text-ink-300">last 30 intervals</div>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5 text-[11px]">
              {["1H", "6H", "24H", "7D"].map((p, i) => (
                <button
                  key={p}
                  className={
                    i === 0
                      ? "rounded-md bg-arize-500/20 px-2.5 py-1 text-arize-100"
                      : "rounded-md px-2.5 py-1 text-ink-300 hover:text-white"
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-spend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8a63ff" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#8a63ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-spend-2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="i"
                  tick={{ fill: "#5a6079", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "#5a6079", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(14,15,23,0.95)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#8a90a8" }}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#8a63ff"
                  strokeWidth={2}
                  fill="url(#g-spend)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80 p-5"
        >
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-[0.14em] text-ink-300">
              Recent Heals
            </div>
            <a href="#/dashboard/heal" className="text-[11px] text-arize-200 hover:text-arize-100">
              View all →
            </a>
          </div>
          <ul className="mt-3 space-y-3">
            {recentHeals.map((h, i) => (
              <motion.li
                key={h.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group rounded-xl border border-white/[0.04] bg-white/[0.015] p-3 transition-colors hover:border-arize-400/20 hover:bg-arize-500/[0.03]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[12.5px]">
                    <span className="font-mono text-arize-200">{h.agent}</span>
                    <span className="text-ink-400">·</span>
                    <span className="text-ink-300">{h.loopCount}× loop</span>
                  </div>
                  <span className="font-mono text-[10.5px] text-ink-400">
                    {timeAgo(h.ts)}
                  </span>
                </div>
                <div className="mt-1.5 line-clamp-1 text-[11.5px] text-ink-300">
                  {h.reason}
                </div>
                <div className="mt-2 flex items-center justify-between text-[10.5px]">
                  <span className="font-mono text-emerald-400">
                    −{fmt(h.wastedTokens)} tokens
                  </span>
                  <span className="font-mono text-ink-400">${h.wastedUsd.toFixed(4)}</span>
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Bottom row: sparkline tiles + recent spans */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[
          { l: "Active spans / sec", v: 412, c: "#8a63ff", k: "arize" as const },
          { l: "Heal success rate", v: 98.2, suffix: "%", c: "#34d399", k: "emerald" as const },
          { l: "Mean cost / 1K tokens", v: 0.0035, prefix: "$", c: "#22d3ee", k: "cyan" as const },
        ].map((s) => {
          const arr = Array.from({ length: 30 }, (_, i) =>
            20 + Math.sin(i / 3) * 8 + Math.random() * 6
          );
          return (
            <div
              key={s.l}
              className="rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80 p-5"
            >
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-[0.14em] text-ink-300">
                  {s.l}
                </div>
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div className="mt-1 font-mono text-2xl font-semibold text-white">
                {s.prefix ?? ""}
                {typeof s.v === "number" ? s.v.toFixed(s.v < 1 ? 4 : 1) : s.v}
                {s.suffix ?? ""}
              </div>
              <Sparkline data={arr} color={s.c} />
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80 p-5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-300">
            Latest spans
          </div>
          <a href="#/dashboard/traces" className="text-[11px] text-arize-200 hover:text-arize-100">
            Open live stream →
          </a>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10.5px] uppercase tracking-[0.14em] text-ink-300">
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Agent</th>
                <th className="py-2 pr-4">Model</th>
                <th className="py-2 pr-4">Summary</th>
                <th className="py-2 pr-4 text-right">Tokens</th>
                <th className="py-2 pr-4 text-right">Latency</th>
                <th className="py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentSpans.map((s) => (
                <tr key={s.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-2 pr-4 font-mono text-ink-300">
                    {new Date(s.ts).toLocaleTimeString("en-US", { hour12: false })}
                  </td>
                  <td className="py-2 pr-4 font-mono text-arize-200">{s.agent}</td>
                  <td className="py-2 pr-4 text-ink-200">{s.model}</td>
                  <td className="py-2 pr-4 text-ink-200">{s.summary}</td>
                  <td className="py-2 pr-4 text-right font-mono text-ink-100">
                    {fmt(s.tokens)}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-ink-100">
                    {s.latencyMs}ms
                  </td>
                  <td className="py-2 text-right">
                    <StatusPill status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: "success" | "warning" | "error" | "healing" }) {
  const map: Record<string, { t: string; label: string; tone: string; dot: string }> = {
    success: { t: "✓", label: "ok", tone: "text-emerald-400", dot: "bg-emerald-400" },
    warning: { t: "!", label: "slow", tone: "text-amber-400", dot: "bg-amber-400" },
    error: { t: "✕", label: "loop", tone: "text-rose-400", dot: "bg-rose-400" },
    healing: { t: "✦", label: "heal", tone: "text-arize-200", dot: "bg-arize-400" },
  };
  const m = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider ${m.tone}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function timeAgo(ts: number) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
