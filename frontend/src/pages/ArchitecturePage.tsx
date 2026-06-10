import Nav from "../components/landing/Nav";
import Architecture from "../components/landing/Architecture";
import Footer from "../components/landing/Footer";

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      <Nav />
      <main className="pt-4">
        <Architecture />
      </main>
      <Footer />
    </div>
  );
}
