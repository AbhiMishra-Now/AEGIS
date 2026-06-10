import { Link } from "react-router-dom";
import Logo from "../Logo";
import { Container, Dot } from "../ui/Primitives";

type LinkItem = { label: string; to?: string; href?: string };

const PRODUCT: LinkItem[] = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Architecture", to: "/architecture" },
  { label: "Live Demo", to: "/demo" },
];
const RESOURCES: LinkItem[] = [
  { label: "Docs", to: "/docs" },
  { label: "GitHub Repo", href: "https://github.com/your-repo" },
];
const COMPANY: LinkItem[] = [
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

function FooterLink({
  to,
  href,
  label,
  children,
}: {
  to?: string;
  href?: string;
  label: string;
  children?: React.ReactNode;
}) {
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-ink-200 transition-colors hover:text-white"
      >
        {children ?? label}
      </a>
    );
  }
  return (
    <Link
      to={to!}
      className="text-ink-200 transition-colors hover:text-white"
    >
      {children ?? label}
    </Link>
  );
}

export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-ink-950 py-14">
      <Container>
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <Logo variant="full" size="sm" tagline="Autonomous Oversight for GCP Agents" />
            <p className="mt-4 max-w-xs text-sm text-ink-300">
              Built for the Google Cloud x Arize MCP Hackathon. Open source demo.{" "}
              <span className="text-ink-200">
                Built with Arize Phoenix MCP &amp; Google Cloud Vertex AI SDK.
              </span>
            </p>
            <div className="mt-4 flex items-center gap-2 text-[12px] text-ink-300">
              <Dot tone="emerald" />
              <span>All systems normal</span>
            </div>
          </div>
          {[
            { h: "Product", l: PRODUCT },
            { h: "Resources", l: RESOURCES },
            { h: "Company", l: COMPANY },
          ].map((col) => (
            <div key={col.h}>
              <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-300">
                {col.h}
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {col.l.map((item) => (
                  <li key={item.label}>
                    <FooterLink to={item.to} href={item.href} label={item.label} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/[0.06] pt-6 text-[12px] text-ink-300 md:flex-row md:items-center">
          <div>
            © 2024 AEGIS Project | Google Cloud x Arize Hackathon Submission
          </div>
          <div className="flex items-center gap-4">
            <Link to="/about" className="hover:text-white">
              About
            </Link>
            <Link to="/contact" className="hover:text-white">
              Contact
            </Link>
            <span className="font-mono text-ink-400">v1.0.0</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
