import { motion } from "framer-motion";
import {
  Activity,
  Radio,
  Wand2,
  Zap,
  Terminal,
} from "lucide-react";
import { Badge, Container, Section, FadeIn } from "../ui/Primitives";
import type { ReactNode } from "react";

function FeatureCard({
  className,
  icon,
  title,
  body,
  visual,
  tone = "arize",
}: {
  className?: string;
  icon: ReactNode;
  title: string;
  body: string;
  visual?: ReactNode;
  tone?: "arize" | "cyan" | "emerald" | "amber" | "rose";
}) {
  const toneText: Record<string, string> = {
    arize: "text-arize-200",
    cyan: "text-cyan-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
  };
  return (
    <FadeIn className={className}>
      <div className="group relative h-full overflow-hidden rounded-3xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80 p-6 transition-all duration-300 hover:-translate-y-0.5">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-arize-500/10 blur-3xl transition-opacity duration-500 group-hover:opacity-100 opacity-60" />
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <span className={toneText[tone]}>{icon}</span>
          </div>
          <h3 className="text-[15px] font-semibold tracking-tight text-white">{title}</h3>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink-200">{body}</p>
        {visual && <div className="mt-5">{visual}</div>}
      </div>
    </FadeIn>
  );
}

function LiveTraceVisual() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-ink-900/60 p-3 font-mono text-[11px] leading-5">
      <div className="flex items-center justify-between text-ink-400">
        <span>phoenix://traces</span>
        <span className="text-emerald-400">● live</span>
      </div>
      <div className="mt-2 space-y-1">
        {[
          ["12:04:21.103", "research-agent", "tool_call  web_search", "ok"],
          ["12:04:21.184", "research-agent", "tool_call  web_search", "ok"],
          ["12:04:21.252", "research-agent", "tool_call  web_search", "warn"],
          ["12:04:21.318", "research-agent", "tool_call  web_search", "loop"],
        ].map(([t, a, m, s], i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 * i }}
            className="flex gap-2"
          >
            <span className="text-ink-400">{t}</span>
            <span
              className={
                s === "loop"
                  ? "text-rose-400"
                  : s === "warn"
                  ? "text-amber-400"
                  : "text-ink-200"
              }
            >
              {a} · {m}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function LoopDetectionVisual() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-ink-900/60 p-2.5">
        <span className="font-mono text-[11px] text-ink-300">tool → web_search</span>
        <div className="flex items-center gap-1">
          {[1, 1, 1, 1].map((_, i) => (
            <span
              key={i}
              className="h-2.5 w-6 rounded-sm bg-gradient-to-r from-arize-500 to-rose-400"
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-ink-300">
        <span className="rounded-md bg-rose-400/10 px-2 py-0.5 font-mono text-rose-400">4× in 297ms</span>
        <span className="text-ink-400">→ loop heuristic fired</span>
      </div>
    </div>
  );
}

function PromptRewritingVisual() {
  return (
    <div className="space-y-1.5 font-mono text-[11px] leading-5">
      <div className="rounded-md border border-rose-400/20 bg-rose-400/[0.04] p-2 text-rose-300 line-through opacity-80">
        - "Be thorough and check multiple sources."
      </div>
      <div className="rounded-md border border-emerald-400/20 bg-emerald-400/[0.05] p-2 text-emerald-300">
        + "Never repeat a previously issued query string."
      </div>
    </div>
  );
}

function ZeroDowntimeVisual() {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <div className="flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-ink-900/60 px-2 py-1 font-mono">
        <span className="text-ink-400">v3.2</span>
        <span className="text-rose-400">⟶</span>
        <span className="text-emerald-400">v3.3</span>
      </div>
      <span className="text-ink-300">applied in 623ms · 0 dropped requests</span>
    </div>
  );
}

export default function Bento() {
  return (
    <Section id="features" className="py-24 md:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge tone="arize">Capabilities</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            A self-healing layer for production agents.
          </h2>
          <p className="mt-3 text-ink-200">
            AEGIS runs as a lightweight oversight service alongside your GCP Agent
            Builder deployment. No code redeploys. No manual intervention. Just
            autonomous loop prevention and token savings.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
          <FeatureCard
            className="lg:col-span-3"
            icon={<Radio className="h-4 w-4" />}
            title="Real-Time Trace Monitoring"
            body="Streams every Vertex AI span via OpenInference OTLP into a sub-second detection pipeline. Watch what your agents are doing — as they do it."
            visual={<LiveTraceVisual />}
          />
          <FeatureCard
            className="lg:col-span-3"
            icon={<Activity className="h-4 w-4" />}
            title="Autonomous Loop Detection"
            body="Detects recursive tool patterns, infinite retry storms, and runaway token spend in <50ms — long before they hit your invoice."
            visual={<LoopDetectionVisual />}
            tone="rose"
          />
          <FeatureCard
            className="lg:col-span-3"
            icon={<Wand2 className="h-4 w-4" />}
            title="Dynamic Prompt Rewriting"
            body="Patches the agent's system instructions via the GCP Vertex AI SDK — atomically, in milliseconds, with zero agent restarts."
            visual={<PromptRewritingVisual />}
            tone="emerald"
          />
          <FeatureCard
            className="lg:col-span-3"
            icon={<Zap className="h-4 w-4" />}
            title="Zero-Downtime Healing"
            body="Applies fixes in-place. Your users never see a 5xx. Your invoices never see a runaway agent. P50 heal latency under 700ms."
            visual={<ZeroDowntimeVisual />}
            tone="cyan"
          />
        </div>

        {/* Decorative terminal strip */}
        <FadeIn className="mt-10">
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900/60 p-4">
            <div className="flex items-center gap-2 text-[11px] font-mono text-ink-300">
              <Terminal className="h-3.5 w-3.5 text-arize-300" />
              <span>aegis · cli</span>
              <span className="ml-auto text-ink-400">↑↓ scroll</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11.5px] font-mono">
              {[
                { k: "trace_id", v: "8f23a1…" },
                { k: "agent", v: "research-agent" },
                { k: "loop_count", v: "4", tone: "text-rose-400" },
                { k: "judge_score", v: "0.94", tone: "text-amber-400" },
                { k: "action", v: "rewrite_system_prompt", tone: "text-emerald-400" },
                { k: "latency", v: "623ms", tone: "text-cyan-400" },
              ].map((c) => (
                <div
                  key={c.k}
                  className="flex items-center gap-2 rounded-md border border-white/[0.05] bg-white/[0.02] px-2.5 py-1"
                >
                  <span className="text-ink-400">{c.k}</span>
                  <span className={c.tone ?? "text-ink-100"}>{c.v}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </Container>
    </Section>
  );
}
