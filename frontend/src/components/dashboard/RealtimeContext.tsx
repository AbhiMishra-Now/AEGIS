import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  generateSpan,
  INITIAL_HEAL_EVENTS,
  INITIAL_SPANS,
  type HealEvent,
  type TraceSpan,
} from "../../lib/mockData";

interface RealtimeCtx {
  spans: TraceSpan[];
  heals: HealEvent[];
  connected: boolean;
  pushHeal: (h: HealEvent) => void;
  pushSpan: (s: TraceSpan) => void;
  tokensSaved: number;
  loopsIntercepted: number;
  totalSpans: number;
  cost: number;
}

const Ctx = createContext<RealtimeCtx | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [spans, setSpans] = useState<TraceSpan[]>(INITIAL_SPANS);
  const [heals, setHeals] = useState<HealEvent[]>(INITIAL_HEAL_EVENTS);
  const [connected, setConnected] = useState(false);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setConnected(true), 320);
    tickRef.current = window.setInterval(() => {
      setSpans((prev) => {
        const next = [generateSpan(), ...prev];
        return next.slice(0, 100);
      });
    }, 1700);
    return () => {
      clearTimeout(t1);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const stats = useMemo(() => {
    const totalSpans = spans.length + 12_403;
    const loops = spans.filter((s) => s.status === "error").length + 47;
    const cost = spans.reduce((acc, s) => acc + s.cost, 0) + 218.42;
    const tokens = spans.reduce((acc, s) => acc + s.tokens, 0) + 1_840_000;
    return {
      totalSpans,
      loopsIntercepted: loops,
      cost,
      tokensSaved: Math.round(tokens * 0.18),
    };
  }, [spans]);

  const value: RealtimeCtx = {
    spans,
    heals,
    connected,
    pushHeal: (h) => setHeals((prev) => [h, ...prev]),
    pushSpan: (s) => setSpans((prev) => [s, ...prev].slice(0, 100)),
    ...stats,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRealtime() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRealtime must be used within RealtimeProvider");
  return v;
}
