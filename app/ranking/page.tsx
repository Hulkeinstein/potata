// HOT 배지(조회수 상위 4개) 30분 주기 반영 — getHotProductIds(1800s) 캐시 재읽기 위해 페이지 ISR
export const revalidate = 1800;

import { getAllProducts } from "@/lib/products";
import { RankingContent } from "./RankingContent";

export default async function RankingPage() {
    const products = await getAllProducts();
    // price 내림차순 정렬 (랭킹 기준)
    const sortedProducts = [...products].sort((a, b) => b.price - a.price);
    return <RankingContent products={sortedProducts} />;
}
