import type { ProductCategory } from '@/types';
export type ViewMode = 'grid' | 'immersive';
export type DiscoveryState = { readonly category: ProductCategory; readonly productId: string | null; readonly photo: number; readonly photos?: Readonly<Record<string, number>> };
export const categories = ['All', 'Outer', 'Top', 'Bottom', 'Dress', 'Acc', 'Shoes'] as const;
export const initialDiscovery: DiscoveryState = { category: 'All', productId: null, photo: 0 };
export function parseCategory(value: unknown): ProductCategory {
  return categories.find(category => category === value) ?? 'All';
}
export function parseDiscovery(value: string | null): DiscoveryState {
  if (!value) return initialDiscovery;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) return initialDiscovery;
    return {
      category: parseCategory('category' in parsed ? parsed.category : null),
      productId: 'productId' in parsed && typeof parsed.productId === 'string' && parsed.productId.length <= 200 ? parsed.productId : null,
      photo: 'photo' in parsed && typeof parsed.photo === 'number' && Number.isSafeInteger(parsed.photo) && parsed.photo >= 0 ? parsed.photo : 0,
      ...('photos' in parsed && typeof parsed.photos === 'object' && parsed.photos !== null ? { photos: Object.fromEntries(Object.entries(parsed.photos).filter(([id, photo]) => id.length <= 200 && typeof photo === 'number' && Number.isSafeInteger(photo) && photo >= 0)) } : {}),
    };
  } catch (error) {
    if (error instanceof SyntaxError) return initialDiscovery;
    throw error;
  }
}
export function storageRead(storage: 'localStorage' | 'sessionStorage', key: string): string | null {
  try { return window[storage].getItem(key); }
  catch (error) { if (error instanceof DOMException) return null; throw error; }
}
export function storageWrite(storage: 'localStorage' | 'sessionStorage', key: string, value: string): void {
  try { window[storage].setItem(key, value); }
  catch (error) { if (!(error instanceof DOMException)) throw error; }
}
