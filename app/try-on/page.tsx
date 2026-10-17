import { getAllProducts } from "@/lib/products";
import { TryOnContent } from "./TryOnContent";
import { Suspense } from "react";
import { StudioLoading } from './StudioLoading';

export default async function TryOnPage() {
    const products = await getAllProducts();
    return (
        <Suspense fallback={<StudioLoading />}>
            <TryOnContent products={products} />
        </Suspense>
    );
}
