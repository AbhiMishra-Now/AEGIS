import { cn } from "../utils/cn";

/**
 * AEGIS logo — a custom shield mark + the "AEGIS" wordmark in Space Grotesk.
 * Three variants: "full" (mark + wordmark + tagline), "compact" (mark + wordmark),
 * "mark" (just the SVG).
 */
type LogoVariant = "full" | "compact" | "mark";
type LogoSize = "xs" | "sm" | "md" | "lg";

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  glow?: boolean;
  className?: string;
  tagline?: string;
  invertTagline?: boolean;
}

const sizeMap: Record<
  LogoSize,
  { mark: number; text: string; tag: string; gap: string; subTag?: string }
> = {
  xs: { mark: 22, text: "text-[13px]", tag: "text-[9px]", gap: "gap-2", subTag: "tracking-[0.18em]" },
  sm: { mark: 28, text: "text-[15px]", tag: "text-[9.5px]", gap: "gap-2.5", subTag: "tracking-[0.18em]" },
  md: { mark: 36, text: "text-[18px]", tag: "text-[10.5px]", gap: "gap-3", subTag: "tracking-[0.2em]" },
  lg: { mark: 56, text: "text-[28px]", tag: "text-[12px]", gap: "gap-4", subTag: "tracking-[0.22em]" },
};

function AegisMark({
  size,
  glow = false,
}: {
  size: number;
  glow?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-[28%] bg-gradient-to-br from-arize-500 via-arize-600 to-arize-800",
        glow && "glow-arize"
      )}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 32 32"
        width={size * 0.62}
        height={size * 0.62}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-white"
      >
        {/* Stylized A — apex inside a shield silhouette */}
        <path d="M16 5 L26 11 V20 C26 24 21.5 27 16 28 C10.5 27 6 24 6 20 V11 Z" opacity="0.25" />
        <path d="M16 9 L23 23 H19.5 L18.3 20.3 H13.7 L12.5 23 H9 Z" />
        <path d="M14.8 17.5 H17.2" />
        <circle cx="16" cy="14" r="0.9" fill="currentColor" stroke="none" />
      </svg>
      {/* subtle inner highlight */}
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10" />
    </span>
  );
}

export default function Logo({
  variant = "compact",
  size = "sm",
  glow = false,
  className,
  tagline = "by Arize Phoenix",
  invertTagline = false,
}: LogoProps) {
  const s = sizeMap[size];
  const wordmarkClass = cn(s.text, "wordmark-aegis leading-none text-white");

  if (variant === "mark") {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <AegisMark size={s.mark} glow={glow} />
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center", s.gap, className)}>
      <AegisMark size={s.mark} glow={glow} />
      <span className="flex flex-col leading-none">
        <span className={wordmarkClass}>
          AEG<span className="text-arize-300">I</span>S
        </span>
        {variant === "full" && tagline && (
          <span
            className={cn(
              "mt-1 font-mono uppercase",
              s.tag,
              s.subTag,
              invertTagline ? "text-ink-300" : "text-ink-300"
            )}
          >
            {tagline}
          </span>
        )}
      </span>
    </span>
  );
}
