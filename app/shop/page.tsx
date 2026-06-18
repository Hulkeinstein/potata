import { getAllProducts } from "@/lib/products";
import { ShopContent } from "./ShopContent";
import { Suspense } from "react";

export default async function ShopPage() {
    const products = await getAllProducts();
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ShopContent products={products} />
        </Suspense>
    );
}
