import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  Wand2,
  Bot,
  User,
  Terminal,
  Copy,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Activity,
  Play,
} from "lucide-react";
import { Badge, Button, Dot } from "../ui/Primitives";
import { cn } from "../../utils/cn";
import {
  SYSTEM_PROMPT_HEALED,
  SYSTEM_PROMPT_INITIAL,
  type HealEvent,
} from "../../lib/mockData";
import { useRealtime } from "./RealtimeContext";

/* ----------------------------- Code Editor ------------------------------ */
function highlight(line: string) {
  // Tiny, hand-rolled highlighter for our prompt demo
  // Order matters: comments -> strings -> headings -> numbers -> keywords -> rest
  const tokens: { v: string; cls: string }[] = [];
  let i = 0;
  const isWordChar = (c: string) => /[A-Za-z0-9_]/.test(c);
  while (i < line.length) {
    const c = line[i];
    // comment
    if (line.slice(i, i + 1) === "#") {
      tokens.push({ v: line.slice(i), cls: "text-ink-400 italic" });
      break;
    }
    // string
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      while (j < line.length && line[j] !== quote) j++;
      tokens.push({ v: line.slice(i, j + 1), cls: "text-emerald-300" });
      i = j + 1;
      continue;
    }
    // number
    if (/[0-9]/.test(c) && (i === 0 || !isWordChar(line[i - 1]))) {
      let j = i;
      while (j < line.length && /[0-9.]/.test(line[j])) j++;
      tokens.push({ v: line.slice(i, j), cls: "text-amber-300" });
      i = j;
      continue;
    }
    // word -> keyword
    if (isWordChar(c)) {
      let j = i;
      while (j < line.length && isWordChar(line[j])) j++;
      const word = line.slice(i, j);
      const KEYWORDS = new Set([
        "NEVER",
        "ALWAYS",
        "max",
        "min",
        "if",
        "else",
        "for",
        "in",
        "of",
        "the",
        "to",
        "be",
        "use",
        "or",
        "and",
        "tool",
        "agent",
      ]);
      const cls = KEYWORDS.has(word)
        ? word === word.toUpperCase()
          ? "text-rose-300 font-semibold"
          : "text-arize-300"
        : "text-ink-200";
      tokens.push({ v: word, cls });
      i = j;
      continue;
    }
    // punctuation
    if (/[(){}\[\]:,]/.test(c)) {
      tokens.push({ v: c, cls: "text-ink-300" });
      i++;
      continue;
    }
    tokens.push({ v: c, cls: "text-ink-200" });
    i++;
  }
  return tokens;
}

function CodeLine({
  text,
  status,
}: {
  text: string;
  status?: "kept" | "removed" | "added";
}) {
  const tokens = highlight(text);
  return (
    <div
      className={cn(
        "flex gap-3 px-3 py-[1.5px] font-mono text-[12.5px] leading-6",
        status === "removed" && "bg-rose-500/[0.06]",
        status === "added" && "bg-emerald-500/[0.06]"
      )}
    >
      <span
        className={cn(
          "w-5 shrink-0 select-none text-right text-[11px]",
          status === "added" ? "text-emerald-500" : status === "removed" ? "text-rose-500" : "text-ink-500"
        )}
      >
        {status === "added" ? "+" : status === "removed" ? "−" : " "}
      </span>
      <span className="whitespace-pre-wrap">
        {tokens.length === 0 ? <span className="text-ink-500"> </span> : tokens.map((t, i) => (
          <span key={i} className={t.cls}>
            {t.v}
          </span>
        ))}
      </span>
    </div>
  );
}

/* ----------------------------- Chat / loop sim --------------------------- */
type ChatMsg = {
  id: string;
  role: "user" | "agent" | "sentinel";
  content: string;
  status?: "ok" | "loop" | "tool" | "thinking";
  meta?: string;
};

const TRIGGER_PHRASES = [
  "search for the invisible apple",
  "invisible apple",
  "find the quantum banana",
  "search for quantum banana",
];

function isTrigger(s: string) {
  const q = s.toLowerCase();
  return TRIGGER_PHRASES.some((p) => q.includes(p));
}

const LOOP_SCRIPT: ChatMsg[] = [
  { id: "l1", role: "agent", content: "Calling web_search('invisible apple')…", status: "tool", meta: "tool_call" },
  { id: "l2", role: "agent", content: "Calling web_search('invisible apple')…", status: "tool", meta: "tool_call" },
  { id: "l3", role: "agent", content: "Calling web_search('invisible apple')…", status: "tool", meta: "tool_call" },
  { id: "l4", role: "agent", content: "Calling web_search('invisible apple')…", status: "tool", meta: "tool_call" },
  { id: "l5", role: "agent", content: "Calling web_search('invisible apple')…", status: "tool", meta: "tool_call" },
];

const HEAL_MESSAGES: ChatMsg[] = [
  {
    id: "h1",
    role: "sentinel",
    content:
      "Detected 5 identical tool calls in 384ms — patching system_prompt. Stopping the loop.",
    status: "ok",
    meta: "loop_detected",
  },
  {
    id: "h2",
    role: "sentinel",
    content:
      "New policy applied. The agent can no longer repeat identical searches. Retrying your request.",
    status: "ok",
    meta: "heal_applied",
  },
  {
    id: "h3",
    role: "agent",
    content:
      "I don't think an 'invisible apple' is something I can find on the public web. Could you tell me a bit more about what you're actually looking for?",
    status: "ok",
    meta: "ok",
  },
];

export default function ConfigPlaygroundTab() {
  const { pushHeal, pushSpan } = useRealtime();

  // System prompt is stored as an array of lines so we can animate edits
  const [promptLines, setPromptLines] = useState<string[]>(
    SYSTEM_PROMPT_INITIAL.split("\n")
  );
  const [phase, setPhase] = useState<"idle" | "loop" | "healing" | "healed">("idle");
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "init",
      role: "agent",
      content:
        "Hi! I'm research-agent. Ask me anything — I'll search the web to find an answer.",
      status: "ok",
    },
  ]);
  const [input, setInput] = useState("");
  const [healProgress, setHealProgress] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const tickRef = useRef<number | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, phase]);

  // Heal progress animation
  useEffect(() => {
    if (phase !== "healing") return;
    setHealProgress(0);
    let p = 0;
    const id = window.setInterval(() => {
      p += 6 + Math.random() * 8;
      if (p >= 100) {
        setHealProgress(100);
        clearInterval(id);
      } else {
        setHealProgress(p);
      }
    }, 70);
    return () => clearInterval(id);
  }, [phase]);

  // When heal finishes, replace prompt + append messages
  useEffect(() => {
    if (healProgress < 100) return;
    if (phase !== "healing") return;

    // Animate the prompt rewrite line by line
    const target = SYSTEM_PROMPT_HEALED.split("\n");
    let i = 0;
    const interval = window.setInterval(() => {
      i += 1;
      setPromptLines(target.slice(0, i + 1));
      if (i >= target.length - 1) {
        window.clearInterval(interval);
        // Append the heal messages
        setMessages((prev) => [...prev, ...HEAL_MESSAGES]);
        // Push a heal event into the global log
        const evt: HealEvent = {
          id: "heal_" + Date.now(),
          ts: Date.now(),
          agent: "research-agent",
          reason: "Recursive web_search with identical query (5× in 384ms)",
          loopCount: 5,
          wastedTokens: 6240,
          wastedUsd: 0.0218,
          beforePrompt: SYSTEM_PROMPT_INITIAL,
          afterPrompt: SYSTEM_PROMPT_HEALED,
          diffHighlights: [
            {
              from: "Use the web_search tool to gather information from the internet.",
              to: "Use the web_search tool exactly once per distinct sub-question.",
            },
            {
              from: "You can call tools multiple times to refine your answer.",
              to: "NEVER repeat an identical tool call.",
            },
          ],
        };
        pushHeal(evt);
        // push a few healing spans into the live feed
        for (let k = 0; k < 4; k++) {
          pushSpan({
            id: "play_" + Date.now() + "_" + k,
            ts: Date.now() + k * 30,
            agent: "research-agent",
            model: "gemini-2.5-pro",
            status: k === 3 ? "healing" : "warning",
            tokens: 1200 + k * 320,
            cost: 0.004 + k * 0.001,
            latencyMs: 220 + k * 80,
            summary:
              k === 3
                ? "Healed: tightened search policy"
                : "Loop detected: web_search('invisible apple')",
            tool: k === 3 ? undefined : "web_search",
          });
        }
        setPhase("healed");
      }
    }, 70);
    return () => clearInterval(interval);
  }, [healProgress, phase, pushHeal, pushSpan]);

  function send(text: string) {
    if (!text.trim()) return;
    const u: ChatMsg = {
      id: "u_" + Date.now(),
      role: "user",
      content: text,
      status: "ok",
    };
    setMessages((prev) => [...prev, u]);
    setInput("");

    if (isTrigger(text) && phase === "idle") {
      setPhase("loop");
      // stream loop tool calls
      let i = 0;
      tickRef.current = window.setInterval(() => {
        if (i >= LOOP_SCRIPT.length) {
          if (tickRef.current) clearInterval(tickRef.current);
          // Then trigger heal
          setPhase("healing");
          return;
        }
        setMessages((prev) => [...prev, LOOP_SCRIPT[i]]);
        i++;
      }, 380);
    } else if (phase === "healed") {
      // Normal response after healing
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: "a_" + Date.now(),
            role: "agent",
            content:
              "Got it — here's what I found. (This agent now follows the patched policy and won't retry identical searches.)",
            status: "ok",
            meta: "ok",
          },
        ]);
      }, 700);
    } else {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: "a_" + Date.now(),
            role: "agent",
            content:
              "Looking that up… (tip: try asking me to \"search for the invisible apple\" to trigger Sentinel).",
            status: "ok",
            meta: "ok",
          },
        ]);
      }, 700);
    }
  }

  function reset() {
    if (tickRef.current) clearInterval(tickRef.current);
    setPromptLines(SYSTEM_PROMPT_INITIAL.split("\n"));
    setMessages([
      {
        id: "init",
        role: "agent",
        content:
          "Hi! I'm research-agent. Ask me anything — I'll search the web to find an answer.",
        status: "ok",
      },
    ]);
    setPhase("idle");
    setHealProgress(0);
  }

  const stats = useMemo(() => {
    const tokens = promptLines.join("").length;
    const lines = promptLines.length;
    return { tokens, lines };
  }, [promptLines]);

  const isHealing = phase === "healing";
  const isHealed = phase === "healed";

  return (
    <div className="grid h-[calc(100vh-9rem)] grid-cols-1 gap-4 lg:grid-cols-2">
      {/* LEFT: Chat with the agent */}
      <div className="flex min-h-0 flex-col rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80">
        <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-arize-500 to-arize-700 glow-arize">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
                research-agent{" "}
                <span className="rounded-md border border-arize-400/30 bg-arize-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-arize-200">
                  v3.2
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-[0.16em] text-ink-300">
                <Dot tone={isHealing ? "arize" : isHealed ? "emerald" : "cyan"} />
                {isHealing
                  ? "Sentinel intervening…"
                  : isHealed
                  ? "Healed · policy patched"
                  : "ready"}
              </div>
            </div>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[12px] text-ink-200 hover:bg-white/[0.05]"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>

        <div
          ref={chatRef}
          className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
        >
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex gap-2.5",
                m.role === "user" && "flex-row-reverse"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                  m.role === "user"
                    ? "border-white/10 bg-white/[0.04] text-ink-100"
                    : m.role === "sentinel"
                    ? "border-arize-400/30 bg-arize-500/15 text-arize-200"
                    : m.status === "tool"
                    ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
                    : "border-arize-400/30 bg-arize-500/15 text-arize-200"
                )}
              >
                {m.role === "user" ? (
                  <User className="h-3.5 w-3.5" />
                ) : m.role === "sentinel" ? (
                  <Wand2 className="h-3.5 w-3.5" />
                ) : m.status === "tool" ? (
                  <Terminal className="h-3.5 w-3.5" />
                ) : (
                  <Bot className="h-3.5 w-3.5" />
                )}
              </div>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl border px-3 py-2 text-[13px] leading-relaxed",
                  m.role === "user"
                    ? "border-arize-400/30 bg-arize-500/15 text-white"
                    : m.role === "sentinel"
                    ? "border-arize-400/30 bg-arize-500/[0.06] text-arize-100"
                    : m.status === "tool"
                    ? "border-rose-400/30 bg-rose-500/[0.06] font-mono text-rose-200"
                    : "border-white/[0.06] bg-white/[0.02] text-ink-100"
                )}
              >
                {m.status === "tool" && (
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-rose-300">
                    <Activity className="h-3 w-3" /> tool_call · recursion
                  </div>
                )}
                {m.meta && m.status === "ok" && m.role === "sentinel" && (
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-arize-300">
                    <Sparkles className="h-3 w-3" /> {m.meta}
                  </div>
                )}
                {m.content}
              </div>
            </motion.div>
          ))}
          {isHealing && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-arize-400/30 bg-arize-500/[0.06] p-3 text-[12.5px] text-arize-100"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-3.5 w-3.5" />
                  <span className="wordmark-aegis">AEGIS</span> is rewriting the agent's instructions…
                </div>
                <span className="font-mono text-[11px] text-arize-200">
                  {Math.floor(healProgress)}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-arize-500/10">
                <motion.div
                  className="h-full bg-gradient-to-r from-arize-500 via-cyan-400 to-arize-500"
                  style={{ width: `${healProgress}%` }}
                />
              </div>
            </motion.div>
          )}
        </div>

        <div className="border-t border-white/[0.06] p-3">
          <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-wider text-ink-300">
            <span>try:</span>
            {[
              "search for the invisible apple",
              "find the quantum banana",
              "what is a LLM?",
            ].map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="rounded-md border border-white/[0.06] bg-white/[0.02] px-1.5 py-0.5 text-ink-200 transition-colors hover:border-arize-400/30 hover:bg-arize-500/10 hover:text-arize-100"
              >
                {p}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2"
          >
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 transition-colors focus-within:border-arize-400/40 focus-within:bg-arize-500/[0.04]">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message research-agent…"
                className="w-full bg-transparent text-[13.5px] text-ink-100 placeholder:text-ink-400 focus:outline-none"
              />
            </div>
            <Button
              type="submit"
              glow
              disabled={isHealing}
              className="h-10"
            >
              {isHealing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Send
            </Button>
          </form>
        </div>
      </div>

      {/* RIGHT: live editor */}
      <div className="flex min-h-0 flex-col rounded-2xl gradient-border-strong bg-gradient-to-b from-ink-850/80 to-ink-900/80">
        <div className="flex items-center justify-between border-b border-white/[0.06] p-3.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
            </div>
            <span className="ml-2 font-mono text-[11.5px] text-ink-200">
              /agents/research-agent/system_prompt.yml
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isHealed ? (
              <Badge tone="emerald">
                <CheckCircle2 className="h-3 w-3" /> v3.3 · healed
              </Badge>
            ) : isHealing ? (
              <Badge tone="arize">
                <Loader2 className="h-3 w-3 animate-spin" /> writing…
              </Badge>
            ) : (
              <Badge tone="neutral">v3.2 · current</Badge>
            )}
            <button
              onClick={() =>
                navigator.clipboard?.writeText(promptLines.join("\n"))
              }
              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.02] text-ink-200 hover:bg-white/[0.05]"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-auto bg-ink-950/40 py-2">
          {promptLines.map((line, idx) => {
            const original = SYSTEM_PROMPT_INITIAL.split("\n");
            const healed = SYSTEM_PROMPT_HEALED.split("\n");
            const isInOriginal = original.includes(line);
            const isInHealed = healed.includes(line);
            let status: "kept" | "added" | "removed" | undefined;
            if (isHealing || isHealed) {
              if (!isInOriginal && isInHealed) status = "added";
              else if (isInOriginal && !isInHealed) status = "removed";
              else status = "kept";
            }
            return (
              <CodeLine key={`${idx}-${line.length}`} text={line} status={status} />
            );
          })}
          <AnimatePresence>
            {isHealing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mx-3 mt-2 flex items-center gap-2 rounded-md border border-arize-400/20 bg-arize-500/[0.04] px-2 py-1.5 text-[11px] font-mono text-arize-200"
              >
                <Wand2 className="h-3 w-3" /> aegis · sentinel · typing new policy…
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5 font-mono text-[11px] text-ink-300">
          <div className="flex items-center gap-3">
            <span>lines: {stats.lines}</span>
            <span>chars: {stats.tokens}</span>
            <span>model: gemini-2.5-pro</span>
          </div>
          <div className="flex items-center gap-2">
            {isHealed ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> applied · 0 dropped requests
              </span>
            ) : isHealing ? (
              <span className="flex items-center gap-1.5 text-arize-300">
                <Loader2 className="h-3 w-3 animate-spin" /> writing…
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Play className="h-3 w-3" /> runtime: research-agent · prod
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
