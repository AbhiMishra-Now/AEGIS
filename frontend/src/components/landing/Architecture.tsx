import { motion } from "framer-motion";
import { Container, Section, Badge, FadeIn } from "../ui/Primitives";
import {
  Server,
  Cloud,
  Eye,
  Wand2,
  RotateCcw,
  ArrowRight,
  Activity,
  Layers,
  Workflow,
  Cpu,
} from "lucide-react";
import type { ReactNode } from "react";

function Node({
  icon,
  title,
  subtitle,
  tone = "arize",
  delay = 0,
  badge,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  tone?: "arize" | "cyan" | "emerald" | "rose" | "amber";
  delay?: number;
  badge?: string;
}) {
  const toneRing: Record<string, string> = {
    arize: "from-arize-500/20 to-arize-700/0",
    cyan: "from-cyan-400/20 to-cyan-400/0",
    emerald: "from-emerald-400/20 to-emerald-400/0",
    rose: "from-rose-400/20 to-rose-400/0",
    amber: "from-amber-400/20 to-amber-400/0",
  };
  const toneText: Record<string, string> = {
    arize: "text-arize-200",
    cyan: "text-cyan-400",
    emerald: "text-emerald-400",
    rose: "text-rose-400",
    amber: "text-amber-400",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay }}
      className="relative w-56 rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80 p-4"
    >
      <div className={`pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br ${toneRing[tone]} opacity-60`} />
      <div className="relative flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
          <span className={toneText[tone]}>{icon}</span>
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-white">{title}</div>
          <div className="truncate text-[10.5px] font-mono uppercase tracking-[0.14em] text-ink-300">
            {subtitle}
          </div>
        </div>
      </div>
      {badge && (
        <div className="relative mt-3 inline-flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-ink-300">
          {badge}
        </div>
      )}
    </motion.div>
  );
}

function AnimatedArrow({
  label,
  tone = "arize",
  delay = 0,
  vertical = false,
}: {
  label: string;
  tone?: "arize" | "cyan" | "emerald" | "rose" | "amber";
  delay?: number;
  vertical?: boolean;
}) {
  const color = {
    arize: "text-arize-300",
    cyan: "text-cyan-400",
    emerald: "text-emerald-400",
    rose: "text-rose-400",
    amber: "text-amber-400",
  }[tone];
  const lineColor = {
    arize: "via-arize-400/40",
    cyan: "via-cyan-400/40",
    emerald: "via-emerald-400/40",
    rose: "via-rose-400/40",
    amber: "via-amber-400/40",
  }[tone];
  if (vertical) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.6 }}
        className="flex flex-col items-center gap-1"
      >
        <div className={`text-[10px] font-mono uppercase tracking-[0.16em] ${color}`}>{label}</div>
        <div className="relative flex h-12 w-6 items-center justify-center">
          <span className="absolute inset-x-0 top-0 bottom-3 my-auto w-px bg-gradient-to-b from-transparent ${lineColor} to-transparent" />
          <ArrowRight className={`absolute bottom-0 h-4 w-4 -rotate-90 ${color}`} />
          <motion.span
            className="absolute h-1.5 w-1.5 rounded-full bg-arize-300 shadow-[0_0_12px_2px_rgba(138,99,255,0.7)]"
            animate={{ y: [0, 40, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6 }}
      className="flex flex-col items-center gap-1"
    >
      <div className={`text-[10px] font-mono uppercase tracking-[0.16em] ${color}`}>{label}</div>
      <div className="relative flex h-6 w-28 items-center sm:w-32">
        <span className={`absolute inset-y-0 left-0 right-3 my-auto h-px bg-gradient-to-r from-transparent ${lineColor} to-transparent`} />
        <ArrowRight className={`absolute right-0 h-4 w-4 ${color}`} />
        <motion.span
          className="absolute h-1.5 w-1.5 rounded-full bg-arize-300 shadow-[0_0_12px_2px_rgba(138,99,255,0.7)]"
          animate={{ x: [0, 110, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
}

function GCPNode() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative w-56 rounded-2xl gradient-border-strong bg-gradient-to-b from-ink-850/80 to-ink-900/80 p-4"
    >
      <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-cyan-400/20 to-cyan-400/0 opacity-60" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/[0.08]">
            <Cloud className="h-4 w-4 text-cyan-300" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-white">GCP Vertex AI Agent</div>
            <div className="text-[10.5px] font-mono uppercase tracking-[0.14em] text-ink-300">
              vertex ai · adk
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          {[
            { l: "model", v: "gemini-2.5-pro", t: "text-arize-200" },
            { l: "region", v: "us-central1", t: "text-cyan-300" },
            { l: "tools", v: "5 enabled", t: "text-emerald-300" },
          ].map((x) => (
            <div
              key={x.l}
              className="flex items-center justify-between rounded-md border border-white/[0.05] bg-white/[0.02] px-2 py-1 font-mono text-[10.5px]"
            >
              <span className="text-ink-400">{x.l}</span>
              <span className={x.t}>{x.v}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function Architecture() {
  return (
    <Section id="architecture" className="py-24 md:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge tone="cyan">Architecture</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            How AEGIS Works
          </h2>
          <p className="mt-3 text-ink-200">
            AEGIS sits between Arize Phoenix MCP and your GCP Vertex AI agent.
            Phoenix carries every span, AEGIS detects the runaway, and the Vertex
            AI SDK applies the patch — atomically, in milliseconds.
          </p>
        </div>

        <FadeIn className="mt-16">
          {/* Desktop: horizontal flow */}
          <div className="relative overflow-hidden rounded-3xl gradient-border-strong bg-ink-900/60 p-8 md:p-10">
            <div className="pointer-events-none absolute inset-0 bg-grid-fine opacity-40" />
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[60%] -translate-x-1/2 rounded-full bg-arize-500/15 blur-3xl" />

            {/* Horizontal flow on md+ */}
            <div className="relative hidden items-center justify-between gap-3 md:flex">
              <GCPNode />
              <AnimatedArrow label="otlp" tone="amber" delay={0.1} />
              <Node
                icon={<Eye className="h-4 w-4" />}
                title="Arize Phoenix MCP"
                subtitle="traces · openinference"
                tone="rose"
                delay={0.15}
                badge="@arizeai/phoenix-mcp"
              />
              <AnimatedArrow label="mcp stream" tone="rose" delay={0.2} />
              <Node
                icon={<Wand2 className="h-4 w-4" />}
                title="AEGIS"
                subtitle="oversight engine"
                tone="arize"
                delay={0.25}
                badge="python · asyncio"
              />
              <AnimatedArrow label="patch" tone="cyan" delay={0.3} />
              <Node
                icon={<Server className="h-4 w-4" />}
                title="Next.js UI"
                subtitle="dashboard"
                tone="cyan"
                delay={0.35}
                badge="WebSocket"
              />
            </div>

            {/* Mobile: vertical flow */}
            <div className="relative flex flex-col items-center gap-2 md:hidden">
              <GCPNode />
              <AnimatedArrow label="otlp" tone="amber" vertical />
              <Node
                icon={<Eye className="h-4 w-4" />}
                title="Arize Phoenix MCP"
                subtitle="traces · openinference"
                tone="rose"
                badge="@arizeai/phoenix-mcp"
              />
              <AnimatedArrow label="mcp stream" tone="rose" vertical />
              <Node
                icon={<Wand2 className="h-4 w-4" />}
                title="AEGIS"
                subtitle="oversight engine"
                tone="arize"
                badge="python · asyncio"
              />
              <AnimatedArrow label="patch" tone="cyan" vertical />
              <Node
                icon={<Server className="h-4 w-4" />}
                title="Next.js UI"
                subtitle="dashboard"
                tone="cyan"
                badge="WebSocket"
              />
            </div>

            {/* Feedback loop note */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="relative mt-8 flex flex-col items-center gap-3"
            >
              <div className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-ink-300">
                heal sequence · sub-second roundtrip
              </div>
              <div className="grid w-full max-w-4xl grid-cols-2 items-stretch gap-3 md:grid-cols-4">
                {[
                  { t: "01", h: "Detect", d: "Phoenix MCP flags recursive span pattern", tone: "rose" as const, icon: <Eye className="h-3.5 w-3.5" /> },
                  { t: "02", h: "Diagnose", d: "Gemini analyzes trace context & root cause", tone: "amber" as const, icon: <Cpu className="h-3.5 w-3.5" /> },
                  { t: "03", h: "Rewrite", d: "Generates optimized system instruction", tone: "arize" as const, icon: <Wand2 className="h-3.5 w-3.5" /> },
                  { t: "04", h: "Apply", d: "Pushes patch via Vertex AI SDK instantly", tone: "emerald" as const, icon: <Layers className="h-3.5 w-3.5" /> },
                ].map((s) => {
                  const toneText = {
                    rose: "text-rose-300",
                    amber: "text-amber-300",
                    arize: "text-arize-300",
                    emerald: "text-emerald-300",
                  }[s.tone];
                  return (
                    <div
                      key={s.t}
                      className="rounded-2xl border border-white/[0.06] bg-ink-900/60 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-[10.5px] tracking-[0.18em] text-ink-300">
                          {s.t}
                        </div>
                        <span className={toneText}>{s.icon}</span>
                      </div>
                      <div className="mt-1 text-[14px] font-semibold text-white">{s.h}</div>
                      <div className="mt-0.5 text-[12.5px] text-ink-200">{s.d}</div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </FadeIn>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[12.5px] text-ink-300">
          <span className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-emerald-400" /> 1,240,883 spans processed today
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-ink-500 sm:inline-block" />
          <span className="flex items-center gap-2">
            <Workflow className="h-3.5 w-3.5 text-cyan-400" /> Median heal latency · 623ms
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-ink-500 sm:inline-block" />
          <span className="flex items-center gap-2">
            <RotateCcw className="h-3.5 w-3.5 text-amber-400" /> 100% reversible
          </span>
        </div>
      </Container>
    </Section>
  );
}
