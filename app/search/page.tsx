import { searchProducts } from "@/lib/products";
import { ProductCard } from "@/components/ui/ProductCard";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const products = query.length >= 2 ? await searchProducts(query) : [];

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
      <h1 className="text-xl font-bold mb-6">검색</h1>

      {!query ? (
        <p className="text-gray-400 mt-8">검색어를 입력하세요.</p>
      ) : products.length > 0 ? (
        <>
          <p className="text-gray-400 mb-6 text-sm">
            &quot;{query}&quot; 검색 결과 {products.length}건
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      ) : (
        <div className="py-20 text-center">
          <p className="text-gray-400 font-medium">
            &quot;{query}&quot;에 대한 검색 결과가 없습니다.
          </p>
        </div>
      )}
    </main>
  );
}
