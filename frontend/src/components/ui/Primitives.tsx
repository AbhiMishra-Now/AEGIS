import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../utils/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export { cn };

/* ----------------------------- Button ----------------------------------- */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  glow?: boolean;
};
export function Button({
  variant = "primary",
  size = "md",
  glow = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const base =
    "relative inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-arize-400/60 disabled:opacity-50 disabled:pointer-events-none";
  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-[15px]",
  };
  const variants: Record<string, string> = {
    primary:
      "bg-gradient-to-b from-arize-500 to-arize-700 text-white border border-arize-400/40 hover:from-arize-400 hover:to-arize-600",
    secondary:
      "bg-white/[0.04] text-ink-100 border border-white/10 hover:bg-white/[0.08] hover:border-white/20",
    ghost: "text-ink-200 hover:text-white hover:bg-white/[0.04]",
    danger:
      "bg-gradient-to-b from-rose-500 to-rose-700 text-white border border-rose-400/40 hover:from-rose-400 hover:to-rose-600",
  };
  return (
    <button
      className={cn(base, sizes[size], variants[variant], glow && "glow-arize-strong", className)}
      {...props}
    >
      {children}
    </button>
  );
}

/* ----------------------------- Badge ------------------------------------ */
export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "arize" | "cyan" | "emerald" | "amber" | "rose";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-white/[0.04] text-ink-200 border-white/10",
    arize: "bg-arize-500/10 text-arize-200 border-arize-400/30",
    cyan: "bg-cyan-400/10 text-cyan-400 border-cyan-400/30",
    emerald: "bg-emerald-400/10 text-emerald-400 border-emerald-400/30",
    amber: "bg-amber-400/10 text-amber-400 border-amber-400/30",
    rose: "bg-rose-400/10 text-rose-400 border-rose-400/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ----------------------------- Card ------------------------------------- */
type CardProps = HTMLMotionProps<"div"> & {
  glow?: boolean;
  bordered?: boolean;
  className?: string;
};
export function Card({ className, glow = false, bordered = true, children, ...props }: CardProps) {
  return (
    <motion.div
      className={cn(
        "rounded-2xl bg-gradient-to-b from-ink-850/80 to-ink-900/80 backdrop-blur-xl",
        bordered && "gradient-border",
        glow && "glow-arize",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/* ----------------------------- Stat ------------------------------------- */
export function Stat({
  label,
  value,
  delta,
  icon,
  tone = "arize",
}: {
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean };
  icon?: ReactNode;
  tone?: "arize" | "cyan" | "emerald" | "amber" | "rose";
}) {
  const toneRing: Record<string, string> = {
    arize: "from-arize-500/30 to-arize-700/0 text-arize-200",
    cyan: "from-cyan-400/30 to-cyan-400/0 text-cyan-400",
    emerald: "from-emerald-400/30 to-emerald-400/0 text-emerald-400",
    amber: "from-amber-400/30 to-amber-400/0 text-amber-400",
    rose: "from-rose-400/30 to-rose-400/0 text-rose-400",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80 p-5">
      <div
        className={cn(
          "pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br blur-2xl opacity-50",
          toneRing[tone].split(" ").slice(0, 2).join(" ")
        )}
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.14em] text-ink-300">{label}</span>
        {icon && (
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/5",
              toneRing[tone].split(" ").slice(-1)[0]
            )}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-end gap-3">
        <div className="font-mono text-[28px] font-semibold text-white tracking-tight">{value}</div>
        {delta && (
          <div
            className={cn(
              "mb-1 text-xs font-medium",
              delta.positive ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {delta.positive ? "▲" : "▼"} {delta.value}
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Section ---------------------------------- */
export function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("relative w-full px-6 md:px-10", className)}>
      {children}
    </section>
  );
}

/* ----------------------------- Container -------------------------------- */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-7xl", className)}>{children}</div>;
}

/* ----------------------------- Dot -------------------------------------- */
export function Dot({ tone = "arize" }: { tone?: "arize" | "cyan" | "emerald" | "amber" | "rose" | "ink" }) {
  const colors: Record<string, string> = {
    arize: "bg-arize-400 shadow-[0_0_10px_rgba(138,99,255,0.7)]",
    cyan: "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]",
    emerald: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]",
    amber: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.7)]",
    rose: "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.7)]",
    ink: "bg-ink-400",
  };
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full", colors[tone])} />;
}

/* ----------------------------- FadeIn ----------------------------------- */
export function FadeIn({
  children,
  delay = 0,
  y = 12,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.6, 0.32, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
