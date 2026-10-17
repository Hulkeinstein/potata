'use client';
import { ProductCard } from '@/components/ui/ProductCard';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { discoveryMessages } from '@/lib/i18n/discovery-messages';
import type { Product } from '@/types';
export function SearchContent({ query, products }: { readonly query: string; readonly products: Product[] }) {
  const { locale } = useLanguage();
  const t = discoveryMessages[locale];
  return <main className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
    <h1 className="text-xl font-bold mb-6">{t.search}</h1>
    {!query ? <p className="text-gray-400 mt-8">{t.enterQuery}</p> : products.length > 0 ? <>
      <p className="text-gray-400 mb-6 text-sm">&quot;{query}&quot; — {products.length} {t.results}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
        {products.map(product => <ProductCard key={product.id} product={product} />)}
      </div>
    </> : <div className="py-20 text-center"><p className="text-gray-400 font-medium">{t.noResults} &quot;{query}&quot;</p></div>}
  </main>;
}
