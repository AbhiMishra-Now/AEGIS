import Nav from "../components/landing/Nav";
import Hero from "../components/landing/Hero";
import LogoCloud from "../components/landing/LogoCloud";
import Bento from "../components/landing/Bento";
import Showcase from "../components/landing/Showcase";
import HowItWorks from "../components/landing/HowItWorks";
import Architecture from "../components/landing/Architecture";
import Integrations from "../components/landing/Integrations";
import StatsStrip from "../components/landing/StatsStrip";
import Testimonials from "../components/landing/Testimonials";
import FAQ from "../components/landing/FAQ";
import CTA from "../components/landing/CTA";
import Footer from "../components/landing/Footer";

export default function Landing() {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      <Nav />
      <main>
        <Hero />
        <LogoCloud />
        <Bento />
        <Showcase />
        <StatsStrip />
        <HowItWorks />
        <Architecture />
        <Integrations />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
