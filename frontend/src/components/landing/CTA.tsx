import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Container, Section, Badge, Button } from "../ui/Primitives";
import { ArrowRight, Sparkles } from "lucide-react";

export default function CTA() {
  return (
    <Section className="py-24 md:py-32">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl gradient-border-strong bg-gradient-to-b from-ink-850/80 to-ink-900/90 p-10 md:p-16"
        >
          <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[60%] -translate-x-1/2 bg-arize-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 right-0 h-72 w-72 bg-cyan-400/15 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-grid-fine opacity-30" />

          <div className="relative grid items-center gap-10 md:grid-cols-2">
            <div>
              <Badge tone="arize">
                <Sparkles className="h-3 w-3" /> Google Cloud x Arize MCP Hackathon
              </Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                Deploy Autonomous Oversight in Minutes.
              </h2>
              <p className="mt-4 max-w-md text-ink-200">
                Connect AEGIS to your Arize Phoenix workspace and GCP project. Watch
                it intercept loops, rewrite prompts, and protect your token budget
                automatically. No SDK rewrites required.
              </p>
            </div>
            <div className="flex flex-col items-start gap-4 md:items-end">
              <Link to="/dashboard">
                <Button size="lg" glow>
                  Launch Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </Container>
    </Section>
  );
}
