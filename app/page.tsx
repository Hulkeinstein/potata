import { Hero } from "@/components/ui/Hero";
import { ProductGrid } from "@/components/ui/ProductGrid";
import { K_TrendSection } from "@/components/ui/K_TrendSection";
import { getAllProducts } from "@/lib/products";

export default async function Home() {
    const products = await getAllProducts();

    return (
        <main className="min-h-screen bg-black text-white pt-16">
            <Hero />
            <K_TrendSection />
            <ProductGrid products={products} />
        </main>
    );
}
