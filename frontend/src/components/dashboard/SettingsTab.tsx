import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Key,
  ShieldCheck,
  Save,
  Loader2,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Coins,
  Eye,
  Lock,
  Activity,
  Sparkles,
} from "lucide-react";
import { Badge, Button, Dot, cn } from "../ui/Primitives";
import {
  fetchIntegrations,
  fetchSettings,
  rotateIntegrationKey,
  saveSettings,
  type ApiKeyMeta,
  type BehavioralSettings,
} from "../../lib/api";

/**
 * Settings tab — behavioral configuration + masked integration status.
 *
 * SECURITY MODEL:
 *   - This tab NEVER asks for, stores, or displays a real API key.
 *   - The "API key" rows below are READ-ONLY masked status (e.g. arize_****1234).
 *     They come from GET /api/integrations, which is the ONLY way the backend
 *     exposes them. The backend reads the actual keys from /backend/.env.
 *   - "Rotate" hits POST /api/integrations/:provider/rotate. The backend
 *     mints a new key server-side, updates /backend/.env, and returns ONLY
 *     the masked meta. The new plaintext key is logged to the server console
 *     (one-time display) and never written to the frontend.
 */

function timeAgo(iso: string | null) {
  if (!iso) return "never";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function NumberField({
  label,
  help,
  value,
  onChange,
  suffix,
}: {
  label: string;
  help: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-300">
        {label}
      </label>
      <p className="mt-1 text-[12px] text-ink-300">{help}</p>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 focus-within:border-arize-400/40 focus-within:bg-arize-500/[0.04]">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-transparent font-mono text-[14px] text-ink-100 focus:outline-none"
        />
        {suffix && <span className="font-mono text-[11px] text-ink-400">{suffix}</span>}
      </div>
    </div>
  );
}

function Toggle({
  label,
  help,
  value,
  onChange,
  tone = "arize",
}: {
  label: string;
  help: string;
  value: boolean;
  onChange: (b: boolean) => void;
  tone?: "arize" | "emerald" | "rose" | "cyan";
}) {
  const on = {
    arize: "bg-arize-500/30 border-arize-400/50",
    emerald: "bg-emerald-500/30 border-emerald-400/50",
    rose: "bg-rose-500/30 border-rose-400/50",
    cyan: "bg-cyan-400/30 border-cyan-400/50",
  }[tone];
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3.5">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-white">{label}</div>
        <div className="mt-0.5 text-[12px] text-ink-300">{help}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
          value ? on : "border-white/10 bg-white/[0.04]"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
            value ? "left-[22px]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}

function TextField({
  label,
  help,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  help: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-300">
        {label}
      </label>
      <p className="mt-1 text-[12px] text-ink-300">{help}</p>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 focus-within:border-arize-400/40 focus-within:bg-arize-500/[0.04]">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent font-mono text-[13px] text-ink-100 placeholder:text-ink-400 focus:outline-none"
        />
      </div>
    </div>
  );
}

function ApiKeyRow({
  meta,
  onRotate,
  busy,
}: {
  meta: ApiKeyMeta;
  onRotate: (provider: string) => void;
  busy: boolean;
}) {
  const providerIcon = {
    arize: <Eye className="h-3.5 w-3.5 text-rose-300" />,
    gcp_vertex: <Cpu className="h-3.5 w-3.5 text-cyan-300" />,
    gemini_judge: <Sparkles className="h-3.5 w-3.5 text-arize-300" />,
  }[meta.provider] ?? <Key className="h-3.5 w-3.5 text-ink-300" />;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.04]">
            {providerIcon}
          </div>
          <div>
            <div className="text-[13px] font-medium text-white">{meta.label}</div>
            <div className="font-mono text-[10.5px] text-ink-400">
              {meta.envVar}
            </div>
          </div>
        </div>
        <Badge tone={meta.lastRotatedAt ? "emerald" : "amber"}>
          {meta.lastRotatedAt ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertTriangle className="h-3 w-3" />
          )}
          rotated {timeAgo(meta.lastRotatedAt)}
        </Badge>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-md border border-white/[0.05] bg-ink-950/60 px-3 py-2">
        <Lock className="h-3 w-3 text-ink-300" />
        <code className="flex-1 font-mono text-[12px] text-ink-200">
          {meta.maskedKey}
        </code>
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-400">
          masked
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <span className="text-ink-300">
          Stored in <code className="text-arize-200">/backend/.env</code> only.
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onRotate(meta.provider)}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RotateCw className="h-3 w-3" />
          )}
          Rotate
        </Button>
      </div>
    </div>
  );
}

export default function SettingsTab() {
  const [settings, setSettings] = useState<BehavioralSettings | null>(null);
  const [integrations, setIntegrations] = useState<ApiKeyMeta[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setSettings(await fetchSettings());
      setIntegrations(await fetchIntegrations());
    })();
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const next = await saveSettings(settings);
      setSettings(next);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  async function rotate(provider: string) {
    setRotating(provider);
    try {
      const next = await rotateIntegrationKey(provider);
      setIntegrations((cur) =>
        cur?.map((k) => (k.provider === next.provider ? next : k)) ?? cur
      );
    } finally {
      setRotating(null);
    }
  }

  if (!settings || !integrations) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-ink-300">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-arize-300" />
        Loading settings from FastAPI…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone="arize">
              <ShieldCheck className="h-3 w-3" /> Zero-trust
            </Badge>
            <Badge tone="neutral">behavioral</Badge>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            <span className="wordmark-aegis text-white">AEGIS</span> · Settings
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-300">
            Tune the oversight engine and review integration status. Real API keys
            live in <code className="text-arize-200">/backend/.env</code> — the
            values below are masked, server-side.
          </p>
        </div>
        <Button glow onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save changes
        </Button>
      </div>

      {savedAt && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/[0.05] px-3 py-2 text-[12px] text-emerald-200"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Settings saved {timeAgo(new Date(savedAt).toISOString())}.
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Loop detection */}
        <div className="rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80 p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-rose-300" />
            <h3 className="text-[14px] font-semibold text-white">Loop detection</h3>
          </div>
          <p className="mt-1 text-[12.5px] text-ink-300">
            Heuristics that fire before any LLM judge is consulted. Lower the
            threshold for stricter detection; raise it to ignore one-off repeats.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField
              label="Tool call threshold"
              help="Same tool called this many times inside the window triggers a loop event."
              value={settings.loopToolThreshold}
              onChange={(n) =>
                setSettings({ ...settings, loopToolThreshold: Math.max(2, n) })
              }
              suffix="calls"
            />
            <NumberField
              label="Sliding window"
              help="Width of the detection window in seconds."
              value={settings.loopWindowSeconds}
              onChange={(n) =>
                setSettings({ ...settings, loopWindowSeconds: Math.max(1, n) })
              }
              suffix="sec"
            />
          </div>
        </div>

        {/* Cost guard */}
        <div className="rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80 p-5">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-300" />
            <h3 className="text-[14px] font-semibold text-white">Cost guard</h3>
          </div>
          <p className="mt-1 text-[12.5px] text-ink-300">
            Triggers a heal when per-minute spend from one agent exceeds this.
          </p>
          <div className="mt-4">
            <NumberField
              label="Spike threshold"
              help="USD per minute for a single agent."
              value={settings.costSpikeThreshold}
              onChange={(n) => setSettings({ ...settings, costSpikeThreshold: n })}
              suffix="USD / min"
            />
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Toggle
          label="Auto-heal enabled"
          help="When the loop heuristic fires, AEGIS rewrites the agent's instructions without human approval."
          value={settings.autoHealEnabled}
          onChange={(b) => setSettings({ ...settings, autoHealEnabled: b })}
          tone="emerald"
        />
        <Toggle
          label="Live dashboard stream"
          help="Push new spans, heals, and prompts in real time over the WebSocket."
          value={settings.liveStreamEnabled}
          onChange={(b) => setSettings({ ...settings, liveStreamEnabled: b })}
          tone="cyan"
        />
      </div>

      {/* GCP defaults */}
      <div className="rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80 p-5">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-cyan-300" />
          <h3 className="text-[14px] font-semibold text-white">GCP defaults</h3>
        </div>
        <p className="mt-1 text-[12.5px] text-ink-300">
          Defaults used when AEGIS invokes the Vertex AI SDK to patch an agent.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Default GCP project"
            help="Project ID the Vertex AI SDK will target when patching."
            value={settings.defaultProject}
            onChange={(s) => setSettings({ ...settings, defaultProject: s })}
            placeholder="my-gcp-project"
          />
          <TextField
            label="Trace judge model"
            help="Gemini model used by the LLM-as-judge to confirm a loop is real."
            value={settings.judgeModel}
            onChange={(s) => setSettings({ ...settings, judgeModel: s })}
            placeholder="gemini-2.5-pro"
          />
        </div>
      </div>

      {/* Integrations / masked keys */}
      <div className="rounded-2xl gradient-border bg-gradient-to-b from-ink-850/80 to-ink-900/80 p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-arize-300" />
              <h3 className="text-[14px] font-semibold text-white">
                Integrations
              </h3>
            </div>
            <p className="mt-1 max-w-xl text-[12.5px] text-ink-300">
              Backend-managed credentials. Values shown here are masked.{" "}
              <span className="text-arize-200">AEGIS never accepts a key from the browser.</span>
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <Dot tone="emerald" />
            <span className="text-emerald-200">all integrations live</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map((k) => (
            <ApiKeyRow
              key={k.provider}
              meta={k}
              onRotate={rotate}
              busy={rotating === k.provider}
            />
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-arize-400/15 bg-arize-500/[0.04] p-4 text-[12.5px] text-arize-100">
          <div className="flex items-start gap-2">
            <Lock className="mt-0.5 h-3.5 w-3.5 text-arize-300" />
            <div>
              <p className="font-medium text-white">Zero-trust key flow</p>
              <p className="mt-1 text-arize-100/80">
                Keys are read once at backend startup from{" "}
                <code>/backend/.env</code> and held in process memory. Rotate
                requests trigger the backend to mint a new key server-side, write
                it to disk, and return only a masked representation to this UI.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
