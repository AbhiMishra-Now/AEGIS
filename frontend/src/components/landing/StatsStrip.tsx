import { motion } from "framer-motion";
import { Container, Section, Dot } from "../ui/Primitives";
import { TrendingUp, ShieldCheck, Timer, Coins } from "lucide-react";

const stats = [
  { v: "1.24M", l: "Spans processed today", icon: TrendingUp, tone: "text-emerald-300" },
  { v: "$184K", l: "Token cost saved this month", icon: Coins, tone: "text-arize-300" },
  { v: "623ms", l: "Median heal latency (p50)", icon: Timer, tone: "text-cyan-300" },
  { v: "100%", l: "Heals rolled back without drift", icon: ShieldCheck, tone: "text-amber-300" },
];

export default function StatsStrip() {
  return (
    <Section className="py-12">
      <Container>
        <div className="relative overflow-hidden rounded-3xl gradient-border-strong bg-gradient-to-b from-ink-850/80 to-ink-900/90 px-6 py-10 md:px-10">
          <div className="pointer-events-none absolute inset-0 bg-grid-fine opacity-30" />
          <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[60%] -translate-x-1/2 rounded-full bg-arize-500/15 blur-3xl" />
          <div className="relative grid grid-cols-2 gap-y-8 md:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.l}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
                className="border-l border-white/[0.06] pl-6 first:border-l-0 first:pl-0 md:first:border-l md:first:pl-6"
              >
                <div className="flex items-center gap-2">
                  <Dot tone="arize" />
                  <span className={`text-[11px] font-mono uppercase tracking-[0.16em] ${s.tone}`}>
                    {s.l}
                  </span>
                </div>
                <div className="mt-2 font-mono text-3xl font-semibold text-white sm:text-4xl">
                  {s.v}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
