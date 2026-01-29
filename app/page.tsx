import { Navbar } from "@/components/ui/Navbar";
import { Hero } from "@/components/ui/Hero";
import { ProductGrid } from "@/components/ui/ProductGrid";
import { K_TrendSection } from "@/components/ui/K_TrendSection";
import { Footer } from "@/components/ui/Footer";

export default function Home() {
    return (
        <main className="min-h-screen bg-white text-gray-900">
            <Navbar />
            <Hero />
            <K_TrendSection />
            <ProductGrid />
            <Footer />
        </main>
    );
}
