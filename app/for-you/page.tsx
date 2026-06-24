// HOT 배지(조회수 상위 4개) 30분 주기 반영 — getHotProductIds(1800s) 캐시 재읽기 위해 페이지 ISR
export const revalidate = 1800;

import { getAllProducts } from "@/lib/products";
import { ForYouContent } from "./ForYouContent";

export default async function ForYouPage() {
    const products = await getAllProducts();
    return <ForYouContent products={products} />;
}
