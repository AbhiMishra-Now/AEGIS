import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";
import Nav from "./Nav";
import Footer from "./Footer";
import { Badge, Button, Container, Section } from "../ui/Primitives";
import { cn } from "../../utils/cn";

type Tone = "arize" | "cyan" | "emerald" | "amber" | "rose";
export type StandaloneKind = "docs" | "about" | "contact";

interface StandalonePageProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
  kind: StandaloneKind;
}

const COPY: Record<
  StandalonePageProps["kind"],
  { heading: string; body: string; bullets: { h: string; d: string }[]; primary: { l: string; href: string } }
> = {
  docs: {
    heading: "Install AEGIS in 4 commands.",
    body: "Spin up the FastAPI backend, point it at your Arize Phoenix MCP and your GCP project, and start the oversight engine. The dashboard will connect automatically.",
    bullets: [
      {
        h: "1. Clone & install",
        d: "git clone aegis && cd aegis/backend && pip install -r requirements.txt",
      },
      {
        h: "2. Configure secrets",
        d: "Copy .env.example to .env, fill ARIZE_PHOENIX_API_KEY, GCP_SERVICE_ACCOUNT_JSON, and GEMINI_API_KEY. Never commit .env.",
      },
      {
        h: "3. Run the FastAPI service",
        d: "uvicorn main:app --reload --port 8000. CORS is locked to the Next.js / Vite frontend origin.",
      },
      {
        h: "4. Open the dashboard",
        d: "Frontend reads VITE_API_BASE — point it at http://localhost:8000/api and the WebSocket at /ws/dashboard.",
      },
    ],
    primary: { l: "Launch dashboard", href: "/dashboard" },
  },
  about: {
    heading: "Built for the Google Cloud x Arize MCP Hackathon.",
    body: "AEGIS is an autonomous oversight layer for production LLM agents on Google Cloud. It watches every span your agents emit, catches runaway loops, and rewrites the agent's instructions in real time.",
    bullets: [
      {
        h: "Why we built it",
        d: "Runaway tool-call loops are the single most expensive failure mode of production agents. We wanted a system that detects the loop and self-heals — without redeploys and without human approval.",
      },
      {
        h: "What's in the box",
        d: "A Python FastAPI backend with the Arize Phoenix MCP worker, an OpenInference-instrumented Vertex AI client, and a Zero-Trust API surface. A React dashboard that talks to it over REST and WebSockets.",
      },
      {
        h: "Open source",
        d: "MIT-licensed. Built for the community. PRs welcome — especially new oversight heuristics.",
      },
    ],
    primary: { l: "View the architecture", href: "/architecture" },
  },
  contact: {
    heading: "Get in touch.",
    body: "Security disclosures, partnership inquiries, demo requests, or just a friendly hello. We answer everything within 48 hours.",
    bullets: [
      { h: "Security", d: "security@aegis.dev · PGP key on the GitHub repo" },
      { h: "Partnerships", d: "partners@aegis.dev" },
      { h: "GitHub", d: "github.com/aegis-sentinel" },
      { h: "Discord", d: "discord.gg/aegis-sentinel" },
    ],
    primary: { l: "Back to home", href: "/" },
  },
};

const toneStyles: Record<Tone, { text: string; ring: string }> = {
  arize: { text: "text-arize-200", ring: "border-arize-400/30 bg-arize-500/[0.08]" },
  cyan: { text: "text-cyan-300", ring: "border-cyan-400/30 bg-cyan-400/[0.08]" },
  emerald: { text: "text-emerald-300", ring: "border-emerald-400/30 bg-emerald-400/[0.08]" },
  amber: { text: "text-amber-300", ring: "border-amber-400/30 bg-amber-400/[0.08]" },
  rose: { text: "text-rose-300", ring: "border-rose-400/30 bg-rose-400/[0.08]" },
};

export default function StandalonePage({ title, icon: Icon, tone, kind }: StandalonePageProps) {
  const copy = COPY[kind];
  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      <Nav />
      <main className="pt-4">
        {/* Hero */}
        <Section className="pt-16 pb-10">
          <Container>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-[12px] text-ink-300 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-3 w-3" /> Back to home
            </Link>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-6"
            >
              <Badge tone={tone}>
                {title}
              </Badge>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl"
            >
              {copy.heading}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-200"
            >
              {copy.body}
            </motion.p>
            <div className="mt-8 flex items-center gap-3">
              <Link to={copy.primary.href}>
                <Button glow>
                  {copy.primary.l}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="secondary">Open dashboard</Button>
              </Link>
            </div>
          </Container>
        </Section>

        {/* Bullets */}
        <Section className="py-10">
          <Container>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {copy.bullets.map((b, i) => (
                <motion.div
                  key={b.h}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  className="rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80 p-5"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg border",
                        toneStyles[tone].ring
                      )}
                    >
                      <Icon className={cn("h-4 w-4", toneStyles[tone].text)} />
                    </div>
                    <h3 className="text-[15px] font-semibold text-white">{b.h}</h3>
                  </div>
                  <p className="mt-3 font-mono text-[12.5px] leading-relaxed text-ink-200">
                    {b.d}
                  </p>
                </motion.div>
              ))}
            </div>
          </Container>
        </Section>

        {/* Inline notice */}
        <Section className="py-16">
          <Container>
            <div className="relative overflow-hidden rounded-3xl gradient-border-strong bg-gradient-to-b from-ink-850/80 to-ink-900/90 p-10 text-center">
              <div className="pointer-events-none absolute inset-0 bg-grid-fine opacity-30" />
              <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[60%] -translate-x-1/2 rounded-full bg-arize-500/15 blur-3xl" />
              <div className="relative">
                <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  See it in action.
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-ink-200">
                  The fastest way to understand AEGIS is to watch it catch a loop
                  in the live Config Playground.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <Link to="/demo">
                    <Button glow>
                      Watch the demo
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Link to="/dashboard">
                    <Button variant="secondary">Launch dashboard</Button>
                  </Link>
                </div>
              </div>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
