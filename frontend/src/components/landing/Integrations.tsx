import {
  Cloud,
  Server,
  Eye,
  MessageSquare,
  Database,
  GitBranch,
  Boxes,
  Sparkles,
} from "lucide-react";
import { Badge, Container, Section, FadeIn } from "../ui/Primitives";
import type { ReactNode } from "react";

const groups: {
  title: string;
  blurb: string;
  items: { name: string; sub: string; icon: ReactNode; tone: string }[];
}[] = [
  {
    title: "Agent runtimes",
    blurb: "If it's instrumented with OpenInference, Sentinel can watch it.",
    items: [
      { name: "Vertex AI Agent Builder", sub: "google-cloud-aiplatform", icon: <Cloud className="h-3.5 w-3.5" />, tone: "text-cyan-300" },
      { name: "Google ADK", sub: "google-adk", icon: <Sparkles className="h-3.5 w-3.5" />, tone: "text-cyan-300" },
      { name: "LangGraph", sub: "langchain", icon: <Boxes className="h-3.5 w-3.5" />, tone: "text-arize-300" },
      { name: "CrewAI", sub: "crewai", icon: <Boxes className="h-3.5 w-3.5" />, tone: "text-arize-300" },
    ],
  },
  {
    title: "Tracing & observability",
    blurb: "Plug into your existing trace store — no migration required.",
    items: [
      { name: "Arize Phoenix MCP", sub: "@arizeai/phoenix-mcp", icon: <Eye className="h-3.5 w-3.5" />, tone: "text-rose-300" },
      { name: "OpenInference OTLP", sub: "any compatible backend", icon: <Server className="h-3.5 w-3.5" />, tone: "text-ink-200" },
      { name: "GCP Cloud Trace", sub: "opentelemetry", icon: <Server className="h-3.5 w-3.5" />, tone: "text-ink-200" },
      { name: "Custom OTLP", sub: "your endpoint", icon: <Server className="h-3.5 w-3.5" />, tone: "text-ink-200" },
    ],
  },
  {
    title: "Runtime & ops",
    blurb: "Sentinel meets your agents where they already live.",
    items: [
      { name: "Cloud Run", sub: "gcp", icon: <Server className="h-3.5 w-3.5" />, tone: "text-cyan-300" },
      { name: "AWS Lambda", sub: "arm64", icon: <Server className="h-3.5 w-3.5" />, tone: "text-cyan-300" },
      { name: "Slack alerts", sub: "webhook", icon: <MessageSquare className="h-3.5 w-3.5" />, tone: "text-amber-300" },
      { name: "GitHub commits", sub: "auto-heal log", icon: <GitBranch className="h-3.5 w-3.5" />, tone: "text-emerald-300" },
    ],
  },
];

function Tile({
  name,
  sub,
  icon,
  tone,
}: {
  name: string;
  sub: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.015] px-3 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-arize-400/30 hover:bg-arize-500/[0.05]">
      <div className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.04]">
        <span className={tone}>{icon}</span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-[12.5px] font-medium text-white">{name}</div>
        <div className="truncate font-mono text-[10.5px] text-ink-400">{sub}</div>
      </div>
    </div>
  );
}

export default function Integrations() {
  return (
    <Section className="py-24 md:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge tone="amber">Integrations</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Bring your own stack. Sentinel is the last layer.
          </h2>
          <p className="mt-3 text-ink-200">
            Drop in alongside whatever you're already running. Sentinel is read-only
            on your traces and write-only on your agent configs.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {groups.map((g, i) => (
            <FadeIn key={g.title} delay={i * 0.06}>
              <div className="h-full rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80 p-5">
                <div className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-ink-300" />
                  <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-300">
                    {g.title}
                  </div>
                </div>
                <h3 className="mt-2 text-[15px] font-semibold text-white">{g.title}</h3>
                <p className="mt-1 text-[12.5px] text-ink-200">{g.blurb}</p>
                <div className="mt-4 grid grid-cols-1 gap-2">
                  {g.items.map((it) => (
                    <Tile key={it.name} {...it} />
                  ))}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </Container>
    </Section>
  );
}
