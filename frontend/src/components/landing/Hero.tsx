import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight, Play, Sparkles, ShieldCheck, Activity, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, Badge, Dot } from "../ui/Primitives";

/* -------- Animated terminal showing a live trace being intercepted -------- */
const TRACE_LINES = [
  { t: "12:04:21.103", a: "research-agent", msg: "tool_call  web_search('quantum banana')", tone: "neutral" },
  { t: "12:04:21.184", a: "research-agent", msg: "tool_call  web_search('quantum banana')", tone: "warn" },
  { t: "12:04:21.252", a: "research-agent", msg: "tool_call  web_search('quantum banana')", tone: "warn" },
  { t: "12:04:21.318", a: "research-agent", msg: "tool_call  web_search('quantum banana')", tone: "error" },
  { t: "12:04:21.401", a: "✦ sentinel", msg: "loop_detected  (4× identical, 297ms)", tone: "arize" },
  { t: "12:04:21.455", a: "✦ sentinel", msg: "judging trace with gemini-2.5-pro…", tone: "arize" },
  { t: "12:04:22.018", a: "✦ sentinel", msg: "PATCH /v1beta/.../agents/research-agent", tone: "arize" },
  { t: "12:04:22.073", a: "✦ sentinel", msg: "✓ heal complete · saved ≈ 12,800 tokens", tone: "emerald" },
];

function toneColor(tone: string) {
  switch (tone) {
    case "error":
      return "text-rose-400";
    case "warn":
      return "text-amber-400";
    case "arize":
      return "text-arize-300";
    case "emerald":
      return "text-emerald-400";
    default:
      return "text-ink-200";
  }
}

function LiveTraceTerminal() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % (TRACE_LINES.length + 4)), 700);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="relative">
      {/* Glow halo */}
      <div className="absolute -inset-10 -z-10 bg-gradient-to-br from-arize-500/20 via-transparent to-cyan-400/10 blur-3xl" />
      <div className="gradient-border-strong overflow-hidden rounded-2xl bg-ink-900/90 shadow-2xl shadow-arize-900/40">
        {/* window chrome */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-ink-300">
            <span className="rounded-md bg-white/[0.04] px-2 py-0.5">arize-phoenix://traces/live</span>
            <span className="rounded-md bg-cyan-400/[0.08] px-2 py-0.5 text-cyan-200">vertex-ai · us-central1</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <Dot tone="emerald" />
            <span className="text-emerald-400">streaming</span>
          </div>
        </div>
        {/* body */}
        <div className="relative h-[340px] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(117,71,246,0.08),transparent_60%)] p-4 font-mono text-[12.5px] leading-6">
          {TRACE_LINES.slice(0, step).map((l, i) => (
            <motion.div
              key={`${l.t}-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="flex gap-3"
            >
              <span className="text-ink-400">{l.t}</span>
              <span className={toneColor(l.tone)}>{l.a.padEnd(16, " ")}</span>
              <span className={toneColor(l.tone)}>{l.msg}</span>
            </motion.div>
          ))}
          {step < TRACE_LINES.length && (
            <div className="mt-1 flex gap-3 text-ink-300">
              <span className="text-ink-400">12:04:21.0…</span>
              <span className="caret text-arize-200">awaiting next span</span>
            </div>
          )}
          {/* fade overlay */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink-900 to-transparent" />
        </div>
        {/* footer stats */}
        <div className="grid grid-cols-3 divide-x divide-white/[0.06] border-t border-white/[0.06] font-mono text-[11px]">
          <div className="px-4 py-2.5">
            <div className="text-ink-400">tokens_saved</div>
            <div className="mt-0.5 text-emerald-400">▲ 12,840</div>
          </div>
          <div className="px-4 py-2.5">
            <div className="text-ink-400">loops_intercepted</div>
            <div className="mt-0.5 text-rose-400">▼ 4 (in 1.3s)</div>
          </div>
          <div className="px-4 py-2.5">
            <div className="text-ink-400">heal_latency_p50</div>
            <div className="mt-0.5 text-cyan-400">623ms</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <div className="relative overflow-hidden">
      {/* Backgrounds */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine opacity-50" />
      <div className="pointer-events-none absolute inset-0 -z-10 spotlight" />
      <div className="blob -top-32 left-1/2 h-[480px] w-[680px] -translate-x-1/2 bg-arize-500/30" />
      <div className="blob top-40 -right-20 h-[320px] w-[420px] bg-cyan-400/20" />
      <div className="blob top-60 -left-32 h-[320px] w-[420px] bg-arize-700/30" />

      <div className="mx-auto max-w-7xl px-6 pb-24 pt-20 md:px-10 md:pb-32 md:pt-28">
        <div className="grid items-center gap-14 lg:grid-cols-12">
          {/* Left: copy */}
          <div className="lg:col-span-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex"
            >
              <Badge tone="arize">
                <Sparkles className="h-3 w-3" /> Google Cloud x Arize MCP Hackathon
              </Badge>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-6 text-[44px] font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-[64px]"
            >
              Stop Paying for{" "}
              <span className="animated-gradient-text">AI Runaway Loops</span>
              <span className="text-arize-300">.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-200"
            >
              <span className="wordmark-aegis text-white">AEGIS</span> is an autonomous
              oversight agent that monitors GCP Vertex AI traces via{" "}
              <span className="text-white">Arize Phoenix MCP</span>. When it detects
              recursive tool calls or cost spikes, it intercepts the session and{" "}
              <em className="not-italic text-white">
                dynamically rewrites the agent's system prompt
              </em>{" "}
              to self-heal in real-time.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link to="/dashboard">
                <Button size="lg" glow>
                  Launch Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/architecture">
                <Button size="lg" variant="secondary">
                  <Play className="h-3.5 w-3.5" /> See it in action
                </Button>
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 text-[12.5px] text-ink-300 sm:grid-cols-3"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> SOC 2 Ready
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-cyan-400" /> &lt;50ms Detection Latency
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-amber-400" /> Zero-Downtime Prompt Patches
              </div>
            </motion.div>

            {/* Stack strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mt-6 flex flex-wrap items-center gap-2 text-[11px]"
            >
              <span className="text-ink-400">Built with</span>
              {[
                { l: "GCP Vertex AI SDK", t: "border-cyan-400/20 text-cyan-200" },
                { l: "Arize Phoenix MCP", t: "border-rose-400/20 text-rose-200" },
                { l: "OpenInference OTLP", t: "border-arize-400/20 text-arize-200" },
                { l: "Gemini 2.5 Pro", t: "border-white/10 text-ink-200" },
              ].map((x) => (
                <span
                  key={x.l}
                  className={`rounded-md border bg-white/[0.02] px-2 py-0.5 font-mono ${x.t}`}
                >
                  {x.l}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right: terminal */}
          <div className="lg:col-span-6">
            <motion.div
              initial={{ opacity: 0, y: 24, rotateX: 8 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.21, 0.6, 0.32, 1] }}
              style={{ transformPerspective: 1200 }}
            >
              <LiveTraceTerminal />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
