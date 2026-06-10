import { Quote } from "lucide-react";
import { Badge, Container, Section, FadeIn } from "../ui/Primitives";

const testimonials = [
  {
    quote:
      "We burned $4,200 in a single weekend on a research agent that retried the same web search 1,800 times. Sentinel would have stopped it after the third. We deployed it on Monday.",
    name: "Priya Subramanian",
    role: "Staff Engineer · Helix Labs",
    avatar: "PS",
    color: "from-arize-500 to-arize-700",
  },
  {
    quote:
      "The Config Playground is the first demo I show to our exec team now. Watching the prompt rewrite itself in real time is the easiest way to explain what 'agent observability' actually means.",
    name: "Marcus Chen",
    role: "VP Engineering · Vector Cloud",
    avatar: "MC",
    color: "from-cyan-500 to-cyan-700",
  },
  {
    quote:
      "We replaced three custom retry-storm monitors with Sentinel. The MCP integration took twenty minutes. The cost line on our Vertex AI invoice has been cut in half.",
    name: "Jana Okafor",
    role: "Head of Platform · Quanta AI",
    avatar: "JO",
    color: "from-emerald-500 to-emerald-700",
  },
  {
    quote:
      "It catches things our eval suite never could. The recursive-pattern detection is shockingly good at distinguishing 'agent is being thorough' from 'agent is stuck'.",
    name: "Diego Ramos",
    role: "CTO · Lattice",
    avatar: "DR",
    color: "from-amber-500 to-amber-700",
  },
  {
    quote:
      "Sub-second heal latency felt like a marketing claim until we watched it in production. It really is sub-second. Watching the dashboard update mid-loop sealed it for us.",
    name: "Yuki Tanaka",
    role: "Principal SRE · Northwind",
    avatar: "YT",
    color: "from-rose-500 to-rose-700",
  },
  {
    quote:
      "Sentinel didn't just save us tokens — it changed how we ship agents. We have a new internal rule: no agent goes to prod without Sentinel watching it.",
    name: "Anya Volkov",
    role: "Director of AI · Obsidian",
    avatar: "AV",
    color: "from-indigo-500 to-indigo-700",
  },
];

export default function Testimonials() {
  return (
    <Section className="py-24 md:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge tone="rose">Loved by builders</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Operators sleeping better at night.
          </h2>
          <p className="mt-3 text-ink-200">
            Engineers shipping agents on GCP and Vertex AI use Sentinel to make
            sure their agents behave — and stay that way.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.05}>
              <div className="group relative h-full overflow-hidden rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-arize-400/30">
                <Quote className="absolute -right-3 -top-3 h-16 w-16 text-arize-500/10 transition-colors group-hover:text-arize-500/20" />
                <p className="relative text-[14px] leading-relaxed text-ink-100">
                  "{t.quote}"
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-[11px] font-semibold text-white`}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-white">{t.name}</div>
                    <div className="text-[11.5px] text-ink-300">{t.role}</div>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </Container>
    </Section>
  );
}
