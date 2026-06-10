import { Container, Section } from "../ui/Primitives";

/* Tiny inline wordmarks — no external deps */
function Wordmark({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-ink-300 transition-colors hover:text-white ${className}`}>
      {children}
    </div>
  );
}

export default function LogoCloud() {
  return (
    <Section className="py-14">
      <Container>
        <div className="mb-8 text-center text-[11px] font-mono uppercase tracking-[0.18em] text-ink-300">
          Trusted by teams already running production agents
        </div>
        <div className="marquee">
          <div className="marquee-track">
            {[
              { name: "Helix Labs", mark: "✺" },
              { name: "Vector Cloud", mark: "▲" },
              { name: "Quanta AI", mark: "◈" },
              { name: "Lattice", mark: "▣" },
              { name: "Parallax", mark: "◐" },
              { name: "Northwind", mark: "❖" },
              { name: "Obsidian", mark: "◆" },
              { name: "Forge & Co", mark: "✦" },
              { name: "Aperture", mark: "◯" },
              { name: "Mercator", mark: "✚" },
            ].map((b) => (
              <Wordmark key={b.name} className="text-base font-semibold tracking-tight">
                <span className="text-arize-300">{b.mark}</span>
                <span className="font-mono text-[14px] tracking-tight">{b.name}</span>
              </Wordmark>
            ))}
            {/* duplicate for seamless loop */}
            {[
              { name: "Helix Labs", mark: "✺" },
              { name: "Vector Cloud", mark: "▲" },
              { name: "Quanta AI", mark: "◈" },
              { name: "Lattice", mark: "▣" },
              { name: "Parallax", mark: "◐" },
              { name: "Northwind", mark: "❖" },
              { name: "Obsidian", mark: "◆" },
              { name: "Forge & Co", mark: "✦" },
              { name: "Aperture", mark: "◯" },
              { name: "Mercator", mark: "✚" },
            ].map((b) => (
              <Wordmark key={b.name + "-b"} className="text-base font-semibold tracking-tight">
                <span className="text-arize-300">{b.mark}</span>
                <span className="font-mono text-[14px] tracking-tight">{b.name}</span>
              </Wordmark>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
