import { Outlet, NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Activity,
  History,
  Code2,
  Search,
  Bell,
  ChevronDown,
  ArrowLeft,
  Cpu,
  Settings,
} from "lucide-react";
import Logo from "../Logo";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Dot } from "../ui/Primitives";
import { cn } from "../../utils/cn";
import { RealtimeProvider } from "./RealtimeContext";

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/traces", label: "Live Traces", icon: Activity },
  { to: "/dashboard/heal", label: "Auto-Heal Log", icon: History },
  { to: "/dashboard/playground", label: "Config Playground", icon: Code2, badge: "NEW" },
  { to: "/dashboard/agents", label: "Agents", icon: Cpu },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/[0.06] bg-ink-950/60 backdrop-blur-xl md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/[0.06] px-4">
        <Logo variant="compact" size="xs" />
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        <div className="px-2 pb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-ink-400">
          Monitor
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all",
                isActive
                  ? "bg-gradient-to-r from-arize-500/15 to-transparent text-white"
                  : "text-ink-200 hover:bg-white/[0.04] hover:text-white"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "absolute -ml-3 h-5 w-0.5 rounded-full bg-arize-400 transition-opacity",
                    isActive ? "opacity-100" : "opacity-0"
                  )}
                />
                <item.icon
                  className={cn(
                    "h-4 w-4",
                    isActive ? "text-arize-300" : "text-ink-300 group-hover:text-ink-100"
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="rounded-md border border-arize-400/30 bg-arize-500/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-arize-200">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}

        <div className="mt-6 px-2 pb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-ink-400">
          Connected
        </div>
        <div className="space-y-1.5 px-2">
          {[
            { name: "phoenix-mcp", status: "live" as const, tone: "emerald" as const },
            { name: "gemini-judge", status: "live" as const, tone: "emerald" as const },
            { name: "config-store", status: "live" as const, tone: "emerald" as const },
          ].map((s) => (
            <div key={s.name} className="flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-2 text-ink-200">
                <Dot tone={s.tone} />
                <span className="font-mono">{s.name}</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-ink-400">
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-ink-300 transition-colors hover:bg-white/[0.04] hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </Link>
      </div>
    </aside>
  );
}

function Topbar() {
  const location = useLocation();
  const label =
    navItems.find((n) =>
      n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
    )?.label ?? "Overview";

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString("en-US", { hour12: false });

  return (
    <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.06] bg-ink-950/70 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <h1 className="text-[15px] font-semibold tracking-tight text-white">{label}</h1>
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-300">
          / {label.toLowerCase().replace(/\s+/g, "-")}
        </span>
      </div>
      <div className="hidden items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[12px] text-ink-300 md:flex md:w-72">
        <Search className="h-3.5 w-3.5" />
        <input
          placeholder="Search traces, agents, prompts…"
          className="w-full bg-transparent text-ink-100 placeholder:text-ink-400 focus:outline-none"
        />
        <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-ink-400">
          ⌘K
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 font-mono text-[11px] text-ink-300 md:flex">
          <Dot tone="emerald" />
          <span>{time} UTC</span>
        </div>
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-ink-200 transition-colors hover:bg-white/[0.05] hover:text-white">
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-semibold text-white">
            3
          </span>
        </button>
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] py-1 pl-1 pr-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-arize-500 to-arize-700 text-[10px] font-semibold text-white">
            EM
          </div>
          <div className="hidden text-left text-[11px] leading-tight md:block">
            <div className="text-white">Elena M.</div>
            <div className="text-ink-300">platform-eng</div>
          </div>
          <ChevronDown className="h-3 w-3 text-ink-300" />
        </div>
      </div>
    </div>
  );
}

export function DashboardShell() {
  return (
    <RealtimeProvider>
      <div className="flex min-h-screen bg-ink-950 text-ink-100">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-grid-fine opacity-30" />
        <div className="pointer-events-none fixed -top-32 left-1/3 -z-10 h-80 w-[480px] -translate-x-1/2 rounded-full bg-arize-500/10 blur-3xl" />
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <AnimatePresence mode="wait">
            <motion.div
              key={typeof window !== "undefined" ? window.location.hash : ""}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="flex-1 px-6 py-6 md:px-8"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </RealtimeProvider>
  );
}
