import { getAllProducts } from "@/lib/products";
import { TryOnContent } from "./TryOnContent";
import { Suspense } from "react";

export default async function TryOnPage() {
    const products = await getAllProducts();
    return (
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Studio...</div>}>
            <TryOnContent products={products} />
        </Suspense>
    );
}
