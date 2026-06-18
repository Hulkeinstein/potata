import { getAllProducts } from "@/lib/products";
import { RankingContent } from "./RankingContent";

export default async function RankingPage() {
    const products = await getAllProducts();
    // price 내림차순 정렬 (랭킹 기준)
    const sortedProducts = [...products].sort((a, b) => b.price - a.price);
    return <RankingContent products={sortedProducts} />;
}
