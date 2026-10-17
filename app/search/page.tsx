import { searchProducts } from "@/lib/products";
import { SearchContent } from './SearchContent';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const products = query.length >= 2 ? await searchProducts(query) : [];

  return <SearchContent query={query} products={products} />;
}
