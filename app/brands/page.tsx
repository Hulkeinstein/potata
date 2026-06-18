import { getAllProducts } from "@/lib/products";
import { BrandsContent } from "./BrandsContent";

export default async function BrandsPage() {
    const products = await getAllProducts();
    return <BrandsContent products={products} />;
}
