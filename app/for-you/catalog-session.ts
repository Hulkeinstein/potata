import type { Product } from '@/types';
import { buildBrandCandidates, buildDiscoveryFeed } from './discovery-feed';
import type { DiscoveryFeedItem } from './discovery-feed';

export type CatalogSession = {
  readonly products: readonly Product[];
  readonly items: readonly DiscoveryFeedItem[];
  readonly usedBrands: readonly string[];
  readonly registeredCount: number;
};
const unique = (products: readonly Product[]) => [...new Map(products.map(product => [product.id, product])).values()];
export function createCatalogSession(incoming: readonly Product[], dismissed: readonly string[]): CatalogSession {
  const products = unique(incoming);
  const items = buildDiscoveryFeed(products, dismissed);
  return { products, items, registeredCount: products.length, usedBrands: items.flatMap(item => item.kind === 'brand' ? [item.brand] : []) };
}
export function refreshCatalogSession(previous: CatalogSession, incoming: readonly Product[], dismissed: readonly string[]): CatalogSession {
  const latest = unique(incoming);
  const byId = new Map(latest.map(product => [product.id, product]));
  const oldIds = new Set(previous.products.map(product => product.id));
  const retained = previous.products.flatMap(product => { const replacement = byId.get(product.id); return replacement ? [replacement] : []; });
  const added = latest.filter(product => !oldIds.has(product.id));
  const products = [...retained, ...added];
  const candidates = buildBrandCandidates(products);
  const byBrand = new Map(candidates.map(brand => [brand.brand, brand]));
  const items: DiscoveryFeedItem[] = [];
  let anchor: string | undefined;
  for (const item of previous.items) {
    switch (item.kind) {
      case 'product': {
        anchor = item.product.id;
        const replacement = byId.get(anchor);
        if (replacement) items.push({ ...item, product: replacement });
        break;
      }
      case 'brand': {
        const replacement = byBrand.get(item.brand);
        if (replacement && anchor && byId.has(anchor) && !dismissed.includes(item.brand)) items.push(replacement);
        break;
      }
      default: { const unreachable: never = item; return unreachable; }
    }
  }
  const usedBrands = new Set(previous.usedBrands);
  added.forEach((product, index) => {
    items.push({ kind: 'product', id: `product:${product.id}`, product });
    if ((previous.registeredCount + index + 1) % 6 !== 0 || index + 1 >= added.length) return;
    const candidate = candidates.find(brand => !usedBrands.has(brand.brand) && !dismissed.includes(brand.brand));
    if (candidate) { items.push(candidate); usedBrands.add(candidate.brand); }
  });
  return { products, items, usedBrands: [...usedBrands], registeredCount: previous.registeredCount + added.length };
}
export function survivingAnchor(previous: readonly DiscoveryFeedItem[], next: readonly DiscoveryFeedItem[], id: string | undefined): string | undefined {
  if (next.some(item => item.id === id)) return id;
  const index = previous.findIndex(item => item.id === id);
  if (index < 0) return next[0]?.id;
  const liveIds = new Set(next.map(item => item.id));
  return [...previous.slice(index + 1), ...previous.slice(0, index).reverse()].find(item => item.kind === 'product' && liveIds.has(item.id))?.id ?? next[0]?.id;
}
