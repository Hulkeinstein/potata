import { getAllProducts } from "@/lib/products";
import { WhatToWearClient } from "@/components/ootd/WhatToWearClient";

// OOTD 피드 — 상품 태그 선택용 카탈로그를 서버에서 로드해 클라이언트로 전달(/liked 패턴).
// 피드 자체는 클라이언트에서 GET /api/ootd로 조회(좋아요 isLiked·최신성).
export default async function WhatToWearPage() {
    const products = await getAllProducts();
    return <WhatToWearClient products={products} />;
}
