import { getAllProducts } from "@/lib/products";
import { ForYouContent } from "./ForYouContent";

export default async function ForYouPage() {
    const products = await getAllProducts();
    return <ForYouContent products={products} />;
}
