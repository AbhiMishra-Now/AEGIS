import { Check, Sparkles } from "lucide-react";
import { Badge, Button, Container, Section, FadeIn, cn } from "../ui/Primitives";
import { Link } from "react-router-dom";

const tiers = [
  {
    name: "Hacker",
    price: "$0",
    sub: "Free forever",
    description: "For solo builders shipping their first agent.",
    cta: "Start free",
    href: "/dashboard",
    features: [
      "1M spans / month",
      "1 connected agent",
      "Phoenix MCP only",
      "7-day auto-heal log",
      "Community support",
    ],
    highlight: false,
  },
  {
    name: "Scale",
    price: "$249",
    sub: "per month",
    description: "For teams running agents in production on GCP.",
    cta: "Start 14-day trial",
    href: "/dashboard",
    features: [
      "50M spans / month",
      "Unlimited agents",
      "Phoenix MCP + OTLP",
      "Unlimited auto-heal history",
      "Git-backed config commits",
      "Slack & PagerDuty alerts",
      "Priority support",
    ],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    sub: "tailored to your GCP project",
    description: "For regulated industries and Fortune 500 AI platforms.",
    cta: "Talk to sales",
    href: "#",
    features: [
      "Unlimited spans",
      "Dedicated GCP region",
      "VPC-SC & CMEK",
      "SOC 2, HIPAA, ISO 27001",
      "Custom SLAs (99.99%)",
      "Dedicated success engineer",
    ],
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <Section id="pricing" className="py-24 md:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge tone="emerald">Pricing</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Pay for the agents you actually run.
          </h2>
          <p className="mt-3 text-ink-200">
            Transparent pricing. No per-seat surprises. Switch tiers any time.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {tiers.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.08}>
              <div
                className={cn(
                  "relative h-full overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5",
                  t.highlight
                    ? "gradient-border-strong bg-gradient-to-b from-arize-500/[0.08] to-ink-900/80 glow-arize"
                    : "gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80"
                )}
              >
                {t.highlight && (
                  <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-arize-400/40 bg-arize-500/15 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-arize-100">
                    <Sparkles className="h-3 w-3" /> Most popular
                  </div>
                )}
                <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-300">
                  {t.name}
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <div className="font-mono text-4xl font-semibold text-white">{t.price}</div>
                  <div className="text-sm text-ink-300">/ {t.sub}</div>
                </div>
                <p className="mt-2 text-[13px] text-ink-200">{t.description}</p>

                <Link to={t.href} className="mt-5 block">
                  <Button
                    className="w-full"
                    variant={t.highlight ? "primary" : "secondary"}
                    glow={t.highlight}
                  >
                    {t.cta}
                  </Button>
                </Link>

                <ul className="mt-6 space-y-2.5">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-ink-100">
                      <span
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                          t.highlight ? "bg-arize-500/20 text-arize-200" : "bg-white/[0.04] text-ink-200"
                        )}
                      >
                        <Check className="h-2.5 w-2.5" />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          ))}
        </div>
      </Container>
    </Section>
  );
}
