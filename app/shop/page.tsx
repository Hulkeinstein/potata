// HOT 배지(조회수 상위 4개) 30분 주기 반영 — getHotProductIds(1800s) 캐시 재읽기 위해 페이지 ISR
export const revalidate = 1800;

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
