import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button, Dot } from "../ui/Primitives";
import Logo from "../Logo";
import { SiGithub } from "../icons/SiGithub";
import { cn } from "../../utils/cn";

/**
 * The Nav bar.
 *
 * In-page anchor links (Features / Demo / Architecture) on the LANDING page
 * jump to the in-page section (#features, #demo, #architecture). On ANY OTHER
 * route they navigate to the dedicated /features, /demo, /architecture pages.
 */
export default function Nav() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  const navLinks = [
    { label: "Features", hash: "#features", route: "/features" },
    { label: "Demo", hash: "#demo", route: "/demo" },
    { label: "Architecture", hash: "#architecture", route: "/architecture" },
    { label: "Docs", hash: null, route: "/docs" },
  ];

  return (
    <header className="sticky top-0 z-50">
      <div className="absolute inset-0 -z-10 bg-ink-950/70 backdrop-blur-xl border-b border-white/[0.06]" />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-10">
        <Link to="/" className="group flex items-center">
          <Logo variant="full" size="sm" glow />
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-ink-200 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.label}
              to={isHome && l.hash ? `/${l.hash}` : l.route}
              className={cn(
                "transition-colors hover:text-white",
                location.pathname === l.route && "text-white"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a
            href="https:github.com/repo"
            target="_blank"
            rel="noreferrer"
            className="hidden text-ink-300 transition-colors hover:text-white md:inline-flex"
            aria-label="GitHub Repository"
          >
            <SiGithub className="h-4 w-4" />
          </a>
          <Link to="/dashboard">
            <Button size="sm" variant="primary" glow>
              Launch Dashboard
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-center gap-2 border-b border-white/[0.04] bg-arize-500/[0.04] py-1.5 text-[11px] text-arize-100"
      >
        <Dot tone="emerald" />
        <span>
          AEGIS v1.0 live · 12,403 traces healed this week · Connected to{" "}
          <span className="font-mono text-arize-200">phoenix-mcp</span>
        </span>
      </motion.div>
    </header>
  );
}
