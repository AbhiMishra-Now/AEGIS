import { Plug, Eye, Wand2, CheckCircle2 } from "lucide-react";
import { Badge, Container, Section, FadeIn } from "../ui/Primitives";

const steps = [
  {
    n: "01",
    icon: Plug,
    title: "Wire Phoenix MCP",
    body:
      "One environment variable. Sentinel subscribes to the same OpenInference stream your agents already emit — no SDK rewrite.",
    code: "ARIZE_PHOENIX_MCP=wss://phoenix.arize.com/mcp",
  },
  {
    n: "02",
    icon: Eye,
    title: "Watch the traces",
    body:
      "Every span — model, tool, latency, cost — flows into the dashboard. Heuristics flag suspicious patterns in <50ms.",
    code: "GET /v1/spans?status=in_flight",
  },
  {
    n: "03",
    icon: Wand2,
    title: "Sentinel rewrites the agent",
    body:
      "When Gemini-as-Judge confirms a runaway, Sentinel calls the Vertex AI Agent Builder API to atomically update the agent's instructions.",
    code: "PATCH /v1beta/projects/.../agents/{id}",
  },
  {
    n: "04",
    icon: CheckCircle2,
    title: "Heal logged, zero downtime",
    body:
      "The fix is committed, the dashboard animates the diff, and your users never see a 5xx. Roll back with a single click.",
    code: "git push origin heal/2026-04-12-loop-482",
  },
];

export default function HowItWorks() {
  return (
    <Section id="how" className="py-24 md:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge tone="emerald">How it works</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            From a runaway tool call to a patched agent in under a second.
          </h2>
          <p className="mt-3 text-ink-200">
            No retraining. No model swaps. No human-in-the-loop required. Sentinel is
            the change-management bot your agents never had.
          </p>
        </div>

        <div className="relative mt-16">
          {/* Connector line for desktop */}
          <div className="pointer-events-none absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-arize-400/40 to-transparent md:block" />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            {steps.map((s, i) => (
              <FadeIn key={s.n} delay={i * 0.08}>
                <div className="group relative h-full rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-arize-400/30">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                      <s.icon className="h-4 w-4 text-arize-200" />
                      <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 font-mono text-[9.5px] text-arize-200 ring-1 ring-arize-400/40">
                        {s.n}
                      </span>
                    </div>
                    <h3 className="text-[15px] font-semibold text-white">{s.title}</h3>
                  </div>
                  <p className="mt-3 text-[13px] leading-relaxed text-ink-200">{s.body}</p>
                  <div className="mt-4 overflow-hidden rounded-lg border border-white/[0.05] bg-ink-950/60">
                    <div className="flex items-center gap-1.5 border-b border-white/[0.05] px-2.5 py-1.5 text-[10px] font-mono text-ink-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-ink-500" />
                      <span>snippet</span>
                    </div>
                    <pre className="scrollbar-thin overflow-x-auto px-2.5 py-2 font-mono text-[11.5px] text-arize-200">
                      <span className="text-ink-400">$ </span>
                      {s.code}
                    </pre>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
