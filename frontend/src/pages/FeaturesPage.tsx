import Nav from "../components/landing/Nav";
import Bento from "../components/landing/Bento";
import Footer from "../components/landing/Footer";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      <Nav />
      <main className="pt-4">
        <Bento />
      </main>
      <Footer />
    </div>
  );
}
