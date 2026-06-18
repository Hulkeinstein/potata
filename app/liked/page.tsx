import { getAllProducts } from "@/lib/products";
import { LikedClient } from "@/components/liked/LikedClient";

export default async function LikedPage() {
    const products = await getAllProducts();
    return <LikedClient products={products} />;
}
