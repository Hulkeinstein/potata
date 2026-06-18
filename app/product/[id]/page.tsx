import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import { getAllProducts, getProductById } from "@/lib/products";

// ISR: 1시간마다 재검증, 빌드에 없는 id도 on-demand 생성 허용
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
    try {
        const products = await getAllProducts();
        return products.map((product) => ({ id: product.id }));
    } catch {
        // 빌드타임 DB 접근 실패 시 빈 배열 — dynamicParams=true로 on-demand 생성
        return [];
    }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const product = await getProductById(id);

    if (!product) {
        notFound();
    }

    return <ProductDetailClient product={product} />;
}
