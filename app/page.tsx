// HOT 배지(조회수 상위 4개) 30분 주기 반영 — getHotProductIds(1800s) 캐시 재읽기 위해 페이지 ISR
export const revalidate = 1800;

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
