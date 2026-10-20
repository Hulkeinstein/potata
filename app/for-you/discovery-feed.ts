import type { Product } from '@/types';

export type ProductFeedItem = { readonly kind: 'product'; readonly id: string; readonly product: Product };
export type BrandFeedItem = { readonly kind: 'brand'; readonly id: string; readonly brand: string; readonly products: readonly Product[] };
export type DiscoveryFeedItem = ProductFeedItem | BrandFeedItem;

export function buildBrandCandidates(catalog: readonly Product[]): readonly BrandFeedItem[] {
  const groups = new Map<string, Product[]>();
  for (const product of catalog) {
    const brand = product.brand.trim();
    const group = groups.get(brand) ?? [];
    group.push(product);
    groups.set(brand, group);
  }
  return [...groups].filter(([brand, items]) => brand.length >= 2 && brand.length <= 100 && items.length >= 2)
    .map(([brand, items]) => ({ kind: 'brand', id: `brand:${brand}`, brand, products: items.slice(0, 3) }));
}
export function buildDiscoveryFeed(products: readonly Product[], dismissed: readonly string[]): readonly DiscoveryFeedItem[] {
  const seen = new Set<string>();
  const catalog = products.filter(product => { if (seen.has(product.id)) return false; seen.add(product.id); return true; });
  const candidates = buildBrandCandidates(catalog);
  const result: DiscoveryFeedItem[] = [];
  let brandIndex = 0;
  catalog.forEach((product, index) => {
    result.push({ kind: 'product', id: `product:${product.id}`, product });
    if ((index + 1) % 6 === 0 && index + 1 < catalog.length) {
      const brand = candidates[brandIndex];
      if (brand) { if (!dismissed.includes(brand.brand)) result.push(brand); brandIndex += 1; }
    }
  });
  return result;
}
