import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import { DashboardShell } from "./components/dashboard/DashboardShell";
import OverviewTab from "./components/dashboard/OverviewTab";
import LiveTracesTab from "./components/dashboard/LiveTracesTab";
import AutoHealTab from "./components/dashboard/AutoHealTab";
import ConfigPlaygroundTab from "./components/dashboard/ConfigPlaygroundTab";
import AgentsTab from "./components/dashboard/AgentsTab";
import SettingsTab from "./components/dashboard/SettingsTab";

/* ================== Standalone pages ================== */
import FeaturesPage from "./pages/FeaturesPage";
import DemoPage from "./pages/DemoPage";
import ArchitecturePage from "./pages/ArchitecturePage";
import StandalonePage, { type StandaloneKind } from "./components/landing/StandalonePage";
import { BookOpen, Building2, Mail } from "lucide-react";

const STANDALONE_PAGES: Record<
  StandaloneKind,
  { title: string; subtitle: string; icon: any; tone: any }
> = {
  docs: {
    title: "Docs",
    subtitle:
      "AEGIS documentation — install the FastAPI backend, point it at your Arize Phoenix MCP and your GCP project, and watch the dashboard light up.",
    icon: BookOpen,
    tone: "cyan",
  },
  about: {
    title: "About",
    subtitle:
      "AEGIS was built for the Google Cloud x Arize MCP Hackathon. The team behind it, the architecture, and the open-source roadmap.",
    icon: Building2,
    tone: "emerald",
  },
  contact: {
    title: "Contact",
    subtitle:
      "Talk to the AEGIS team — security disclosures, partnership inquiries, or just to say hi.",
    icon: Mail,
    tone: "amber",
  },
};

function Standalone({ kind }: { kind: StandaloneKind }) {
  const meta = STANDALONE_PAGES[kind];
  return (
    <StandalonePage
      title={meta.title}
      subtitle={meta.subtitle}
      icon={meta.icon}
      tone={meta.tone}
      kind={kind}
    />
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* Standalone marketing pages */}
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/architecture" element={<ArchitecturePage />} />
        <Route path="/docs" element={<Standalone kind="docs" />} />
        <Route path="/about" element={<Standalone kind="about" />} />
        <Route path="/contact" element={<Standalone kind="contact" />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<DashboardShell />}>
          <Route index element={<OverviewTab />} />
          <Route path="traces" element={<LiveTracesTab />} />
          <Route path="heal" element={<AutoHealTab />} />
          <Route path="playground" element={<ConfigPlaygroundTab />} />
          <Route path="agents" element={<AgentsTab />} />
          <Route path="settings" element={<SettingsTab />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
