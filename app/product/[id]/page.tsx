import { PRODUCTS } from "@/data/dummy";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import { use } from "react";

export async function generateStaticParams() {
    return PRODUCTS.map((product) => ({
        id: product.id,
    }));
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const product = PRODUCTS.find((p) => p.id === id);

    if (!product) {
        notFound();
    }

    return <ProductDetailClient product={product} />;
}
