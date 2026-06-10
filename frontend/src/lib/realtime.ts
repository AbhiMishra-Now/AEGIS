import { useEffect, useRef, useState } from "react";
import {
  generateSpan,
  INITIAL_HEAL_EVENTS,
  INITIAL_SPANS,
  type HealEvent,
  type TraceSpan,
} from "./mockData";

/**
 * Simulates the FastAPI WebSocket stream that would normally be served from
 * the Sentinel agent. Pushes new spans, and occasionally fires heal events.
 */
export function useRealtimeTraceStream() {
  const [spans, setSpans] = useState<TraceSpan[]>(INITIAL_SPANS);
  const [heals, setHeals] = useState<HealEvent[]>(INITIAL_HEAL_EVENTS);
  const [connected, setConnected] = useState(false);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setConnected(true), 320);
    tickRef.current = window.setInterval(() => {
      setSpans((prev) => {
        const next = [generateSpan(), ...prev];
        return next.slice(0, 80);
      });
    }, 1400);
    return () => {
      clearTimeout(t1);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  return { spans, heals, connected, setSpans, setHeals };
}
