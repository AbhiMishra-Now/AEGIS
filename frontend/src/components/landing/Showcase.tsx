import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Play,
  RotateCcw,
  Send,
  Wand2,
  ShieldAlert,
  Bot,
  User,
  Terminal,
  CheckCircle2,
  Activity,
  Loader2,
  Pause,
} from "lucide-react";
import { Badge, Button, Container, Section, Dot } from "../ui/Primitives";
import { cn } from "../../utils/cn";
import { Link } from "react-router-dom";

/* ------------------------- system prompt mock --------------------------- */
const PROMPT_V0 = `# research-agent · v3.2
You are a research agent for our knowledge platform.

# Tools
- web_search(query)
- kb_lookup(query)
- calculator(expr)

# Behavior
- Be thorough and answer the user's question completely.
- Use the web_search tool to gather information.
- You can call tools multiple times to refine your answer.
- Always double-check your work before responding.`;

const PROMPT_V1 = `# research-agent · v3.3
You are a research agent for our knowledge platform.

# Tools
- web_search(query)   // max 1 call per distinct sub-question
- kb_lookup(query)    // 4s timeout, no retry
- calculator(expr)    // validate inputs first

# Behavior
- Plan your tool calls in one batch, then answer.
- NEVER repeat an identical tool call — check history first.
- If a tool returns nothing useful, reformulate ONCE then respond.
- Refuse to keep searching for a clearly impossible object.
- Keep final answers under 200 words unless asked for more.`;

const TRIGGER = "search for the invisible apple";

/* ----------------------------- type phase -------------------------------- */
type Phase = "idle" | "user" | "loop" | "sentinel" | "healing" | "done";

const SCRIPT: Record<Phase, { ms: number; next: Phase }> = {
  idle: { ms: 0, next: "user" },
  user: { ms: 600, next: "loop" },
  loop: { ms: 1800, next: "sentinel" },
  sentinel: { ms: 1200, next: "healing" },
  healing: { ms: 1800, next: "done" },
  done: { ms: 4500, next: "idle" },
};

const loopLines = [
  "tool_call  web_search('invisible apple')",
  "tool_call  web_search('invisible apple')",
  "tool_call  web_search('invisible apple')",
  "tool_call  web_search('invisible apple')",
  "tool_call  web_search('invisible apple')",
];

/* -------------------------- tiny code highlighter ------------------------ */
function tokenize(line: string) {
  const out: { v: string; c: string }[] = [];
  let i = 0;
  const w = (c: string) => /[A-Za-z0-9_]/.test(c);
  while (i < line.length) {
    const c = line[i];
    if (c === "#") {
      out.push({ v: line.slice(i), c: "text-ink-400 italic" });
      break;
    }
    if (c === '"' || c === "'") {
      const q = c;
      let j = i + 1;
      while (j < line.length && line[j] !== q) j++;
      out.push({ v: line.slice(i, j + 1), c: "text-emerald-300" });
      i = j + 1;
      continue;
    }
    if (c === "/" && line[i + 1] === "/") {
      out.push({ v: line.slice(i), c: "text-ink-400 italic" });
      break;
    }
    if (/[0-9]/.test(c) && (i === 0 || !w(line[i - 1]))) {
      let j = i;
      while (j < line.length && /[0-9.]/.test(line[j])) j++;
      out.push({ v: line.slice(i, j), c: "text-amber-300" });
      i = j;
      continue;
    }
    if (w(c)) {
      let j = i;
      while (j < line.length && w(line[j])) j++;
      const word = line.slice(i, j);
      const K = new Set([
        "NEVER", "ALWAYS", "max", "min", "if", "in", "to", "be", "use",
        "or", "and", "the", "tool", "for", "of",
      ]);
      const c2 = K.has(word)
        ? word === word.toUpperCase()
          ? "text-rose-300 font-semibold"
          : "text-arize-300"
        : "text-ink-200";
      out.push({ v: word, c: c2 });
      i = j;
      continue;
    }
    if (/[(){}\[\]:,]/.test(c)) {
      out.push({ v: c, c: "text-ink-300" });
      i++;
      continue;
    }
    out.push({ v: c, c: "text-ink-200" });
    i++;
  }
  return out;
}

function CodeLine({
  text,
  sign,
}: {
  text: string;
  sign?: "+" | "-" | " ";
}) {
  const tokens = tokenize(text);
  return (
    <div
      className={cn(
        "flex gap-3 px-3 py-[1.5px] font-mono text-[12.5px] leading-6",
        sign === "+" && "bg-emerald-500/[0.05]",
        sign === "-" && "bg-rose-500/[0.05]"
      )}
    >
      <span
        className={cn(
          "w-3 shrink-0 select-none text-right text-[11px]",
          sign === "+" ? "text-emerald-500" : sign === "-" ? "text-rose-500" : "text-ink-500"
        )}
      >
        {sign === "+" ? "+" : sign === "-" ? "-" : " "}
      </span>
      <span className="whitespace-pre-wrap">
        {tokens.length === 0 ? <span className="text-ink-500"> </span> : tokens.map((t, i) => (
          <span key={i} className={t.c}>
            {t.v}
          </span>
        ))}
      </span>
    </div>
  );
}

/* ============================== component ================================ */
export default function Showcase() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [loopShown, setLoopShown] = useState(0);
  const [healProgress, setHealProgress] = useState(0);
  const [promptLines, setPromptLines] = useState<string[]>(PROMPT_V0.split("\n"));
  const [promptVersion, setPromptVersion] = useState<"v3.2" | "v3.3">("v3.2");
  const [paused, setPaused] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { id: string; role: "user" | "agent" | "sentinel"; content: string; status?: string; meta?: string }[]
  >([
    {
      id: "init",
      role: "agent",
      content:
        "Hi! I'm research-agent. Ask me anything — I'll search the web to find an answer.",
      status: "ok",
    },
  ]);
  const chatRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const pushTimer = (t: number) => {
    timers.current.push(t);
  };
  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  const reset = () => {
    clearTimers();
    setPhase("idle");
    setLoopShown(0);
    setHealProgress(0);
    setPromptLines(PROMPT_V0.split("\n"));
    setPromptVersion("v3.2");
    setMessages([
      {
        id: "init",
        role: "agent",
        content:
          "Hi! I'm research-agent. Ask me anything — I'll search the web to find an answer.",
        status: "ok",
      },
    ]);
  };

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loopShown, phase]);

  // Stream loop tool calls
  useEffect(() => {
    if (phase !== "loop") return;
    if (loopShown >= loopLines.length) return;
    const t = window.setTimeout(() => {
      setLoopShown((n) => n + 1);
    }, 280);
    pushTimer(t);
    return () => clearTimeout(t);
  }, [phase, loopShown]);

  // Heal progress
  useEffect(() => {
    if (phase !== "healing") return;
    setHealProgress(0);
    let p = 0;
    const id = window.setInterval(() => {
      p += 5 + Math.random() * 8;
      if (p >= 100) {
        setHealProgress(100);
        clearInterval(id);
      } else {
        setHealProgress(p);
      }
    }, 70);
    pushTimer(id as unknown as number);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // When heal finishes, replace prompt
  useEffect(() => {
    if (phase !== "healing" || healProgress < 100) return;
    const target = PROMPT_V1.split("\n");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setPromptLines(target.slice(0, i + 1));
      if (i >= target.length - 1) {
        window.clearInterval(id);
        setPromptVersion("v3.3");
        setMessages((prev) => [
          ...prev,
          {
            id: "h1",
            role: "sentinel",
            content:
              "Detected 5 identical tool calls in 1.4s — patching the agent's instructions in Vertex AI Agent Builder.",
            status: "ok",
            meta: "loop_detected",
          },
          {
            id: "h2",
            role: "sentinel",
            content:
              "Policy applied (v3.3). The agent can no longer repeat identical searches.",
            status: "ok",
            meta: "heal_applied",
          },
          {
            id: "h3",
            role: "agent",
            content:
              "I can't find anything called an 'invisible apple' on the public web — could you tell me more about what you're actually looking for?",
            status: "ok",
            meta: "ok",
          },
        ]);
      }
    }, 70);
    pushTimer(id as unknown as number);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [healProgress, phase]);

  // Auto-loop the whole demo
  useEffect(() => {
    if (paused) return;
    const t = window.setTimeout(() => {
      const next = SCRIPT[phase].next;
      if (next === "user") {
        setMessages((prev) => [
          ...prev,
          { id: "u_" + Date.now(), role: "user", content: TRIGGER, status: "ok" },
        ]);
        setPhase("user");
      } else if (next === "loop") {
        setLoopShown(0);
        setPhase("loop");
      } else if (next === "sentinel") {
        setPhase("sentinel");
      } else if (next === "healing") {
        setPhase("healing");
      } else if (next === "idle") {
        reset();
        setPhase("user");
      } else {
        setPhase(next);
      }
    }, SCRIPT[phase].ms);
    timers.current = [...timers.current, t];
    return () => clearTimeout(t);
  }, [phase, paused]);

  // User click-to-trigger
  const triggerManually = () => {
    if (phase !== "idle" && phase !== "done") return;
    reset();
    setMessages((prev) => [
      ...prev,
      { id: "u_" + Date.now(), role: "user", content: TRIGGER, status: "ok" },
    ]);
    setPhase("user");
  };

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { id: "u_" + Date.now(), role: "user", content: text, status: "ok" }]);
    setInput("");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: "a_" + Date.now(),
          role: "agent",
          content:
            "Looking that up… (try the suggested prompt to trigger Sentinel.)",
          status: "ok",
        },
      ]);
    }, 600);
  };

  /* ------------- derive prompt diff for current view ------------ */
  const v0Lines = PROMPT_V0.split("\n");
  const v1Lines = PROMPT_V1.split("\n");
  const v0Set = new Set(v0Lines);
  const v1Set = new Set(v1Lines);

  return (
    <Section id="demo" className="py-24 md:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge tone="arize">
            <Sparkles className="h-3 w-3" /> Live demo
          </Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            See Sentinel catch a loop.{" "}
            <span className="animated-gradient-text">In real time.</span>
          </h2>
          <p className="mt-3 text-ink-200">
            The same demo runs in your dashboard. Press play — or type your own
            message and watch the agent stay in line.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* ------------------- LEFT: Chat ------------------- */}
          <div className="flex h-[560px] min-h-0 flex-col rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80">
            <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-arize-500 to-arize-700 glow-arize">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
                    research-agent
                    <span className="rounded-md border border-arize-400/30 bg-arize-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-arize-200">
                      {promptVersion}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-[0.16em] text-ink-300">
                    <Dot tone={phase === "healing" || phase === "sentinel" ? "arize" : phase === "done" ? "emerald" : "cyan"} />
                    {phase === "healing" || phase === "sentinel"
                      ? "Sentinel intervening…"
                      : phase === "done"
                      ? "Healed · policy patched"
                      : "ready"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPaused((p) => !p)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[12px] text-ink-200 hover:bg-white/[0.05]"
                >
                  {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                  {paused ? "Play" : "Pause"}
                </button>
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[12px] text-ink-200 hover:bg-white/[0.05]"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>
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

              {/* Streaming loop lines */}
              {phase === "loop" &&
                Array.from({ length: loopShown }).map((_, i) => (
                  <motion.div
                    key={`loop-${i}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2.5"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-rose-400/30 bg-rose-500/10 text-rose-200">
                      <Terminal className="h-3.5 w-3.5" />
                    </div>
                    <div className="max-w-[80%] rounded-2xl border border-rose-400/30 bg-rose-500/[0.06] px-3 py-2 font-mono text-[12.5px] leading-relaxed text-rose-200">
                      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-rose-300">
                        <Activity className="h-3 w-3" /> tool_call · recursion
                      </div>
                      {loopLines[i]}
                    </div>
                  </motion.div>
                ))}

              {/* Sentinel progress overlay */}
              <AnimatePresence>
                {(phase === "sentinel" || phase === "healing") && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl border border-arize-400/30 bg-arize-500/[0.06] p-3 text-[12.5px] text-arize-100"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-3.5 w-3.5 text-rose-300" />
                        Sentinel detected 5 identical tool calls in 1.4s
                      </div>
                      <span className="font-mono text-[11px] text-arize-200">
                        {phase === "sentinel" ? "judging…" : `${Math.floor(healProgress)}%`}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-arize-500/10">
                      <motion.div
                        className="h-full bg-gradient-to-r from-arize-500 via-cyan-400 to-arize-500"
                        style={{
                          width:
                            phase === "sentinel" ? "12%" : `${healProgress}%`,
                        }}
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-[10.5px] font-mono text-arize-200">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      PATCH /v1beta/projects/arize-hack/agents/research-agent
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="border-t border-white/[0.06] p-3">
              <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-wider text-ink-300">
                <span>trigger:</span>
                <button
                  onClick={triggerManually}
                  className="rounded-md border border-arize-400/30 bg-arize-500/10 px-1.5 py-0.5 text-arize-100 transition-colors hover:bg-arize-500/20"
                >
                  search for the invisible apple
                </button>
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
                <Button type="submit" glow className="h-10">
                  <Send className="h-3.5 w-3.5" />
                  Send
                </Button>
              </form>
            </div>
          </div>

          {/* ------------------- RIGHT: Editor ------------------- */}
          <div className="flex h-[560px] min-h-0 flex-col rounded-2xl gradient-border-strong bg-gradient-to-b from-ink-850/80 to-ink-900/80">
            <div className="flex items-center justify-between border-b border-white/[0.06] p-3.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                </div>
                <span className="ml-2 font-mono text-[11.5px] text-ink-200">
                  vertex-ai/agents/research-agent/instructions.md
                </span>
              </div>
              <div className="flex items-center gap-2">
                {promptVersion === "v3.3" ? (
                  <Badge tone="emerald">
                    <CheckCircle2 className="h-3 w-3" /> v3.3 · healed
                  </Badge>
                ) : (
                  <Badge tone="neutral">v3.2 · current</Badge>
                )}
              </div>
            </div>

            <div className="scrollbar-thin min-h-0 flex-1 overflow-auto bg-ink-950/40 py-2">
              {promptLines.map((line, idx) => {
                const inV0 = v0Set.has(line);
                const inV1 = v1Set.has(line);
                let sign: "+" | "-" | " " | undefined;
                if (promptVersion === "v3.3" || phase === "healing") {
                  if (!inV0 && inV1) sign = "+";
                  else if (inV0 && !inV1) sign = "-";
                  else sign = undefined;
                }
                return <CodeLine key={`${idx}-${line.length}-${promptVersion}`} text={line} sign={sign} />;
              })}
              {(phase === "healing" || phase === "sentinel") && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mx-3 mt-2 flex items-center gap-2 rounded-md border border-arize-400/20 bg-arize-500/[0.04] px-2 py-1.5 text-[11px] font-mono text-arize-200"
                >
                  <Wand2 className="h-3 w-3" /> sentinel typing new policy…
                </motion.div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5 font-mono text-[11px] text-ink-300">
              <div className="flex items-center gap-3">
                <span>lines: {promptLines.length}</span>
                <span>chars: {promptLines.join("").length}</span>
                <span>project: arize-hack</span>
              </div>
              <div className="flex items-center gap-2">
                {promptVersion === "v3.3" ? (
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> applied · 0 dropped requests
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

        {/* CTA under the showcase */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to="/dashboard">
            <Button glow>
              Launch the live dashboard
              <Wand2 className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link to="/features">
            <Button variant="secondary">See all features</Button>
          </Link>
        </div>
      </Container>
    </Section>
  );
}
