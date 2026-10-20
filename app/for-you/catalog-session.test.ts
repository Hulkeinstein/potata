import { describe, expect, it } from 'vitest';
import type { Product } from '@/types';
import { createCatalogSession, refreshCatalogSession, survivingAnchor } from './catalog-session';
const product = (id: string, brand = 'Alpha'): Product => ({ id, brand, name: id, imageUrl: '/a.jpg', price: 10 });
describe('catalog session reconciliation', () => {
  it('keeps old order, updates metadata, removes missing ids and appends unique new ids', () => {
    // Given
    const session = createCatalogSession([product('a'), product('b'), product('c')], []);
    // When
    const next = refreshCatalogSession(session, [product('n'), { ...product('c'), price: 99 }, product('a'), product('n')], []);
    // Then
    expect(next.products.map(item => item.id)).toEqual(['a', 'c', 'n']);
    expect(next.products[1]?.price).toBe(99);
    expect(survivingAnchor(session.items, next.items, 'product:b')).toBe('product:c');
  });
  it('keeps brand anchors and never fills an invalidated brand slot with another brand', () => {
    // Given
    const products = Array.from({ length: 9 }, (_, i) => product(String(i), i < 2 ? 'Alpha' : 'Beta'));
    const session = createCatalogSession(products, []);
    // When
    const next = refreshCatalogSession(session, products.map(item => item.id === '1' ? { ...item, brand: 'Beta' } : item), []);
    // Then
    expect(next.items.filter(item => item.kind === 'brand')).toEqual([]);
    expect(next.usedBrands).toContain('Alpha');
  });
  it('only creates unused brands at newly appended six-product boundaries', () => {
    // Given
    const initial = Array.from({ length: 9 }, (_, i) => product(String(i)));
    const session = createCatalogSession(initial, []);
    const added = Array.from({ length: 5 }, (_, i) => product(`n${i}`, 'Beta'));
    // When
    const next = refreshCatalogSession(session, [...added, ...initial], []);
    // Then
    const brands = next.items.filter(item => item.kind === 'brand');
    expect(brands.map(item => item.id)).toEqual(['brand:Alpha', 'brand:Beta']);
    expect(next.items[next.items.findIndex(item => item.id === 'brand:Beta') - 1]?.id).toBe('product:n2');
  });
  it('uses the next product for a removed brand and the previous product at the end', () => {
    // Given
    const products = Array.from({ length: 9 }, (_, i) => product(String(i)));
    const session = createCatalogSession(products, []);
    // When
    const next = refreshCatalogSession(session, products.filter(item => item.id !== '8'), ['Alpha']);
    // Then
    expect(survivingAnchor(session.items, next.items, 'brand:Alpha')).toBe('product:6');
    expect(survivingAnchor(session.items, next.items, 'product:8')).toBe('product:7');
    expect(survivingAnchor(session.items, [], 'product:8')).toBeUndefined();
  });
  it('refreshes brand samples in the stable session product order without moving its slot', () => {
    // Given
    const products = Array.from({ length: 9 }, (_, i) => product(String(i)));
    const session = createCatalogSession(products, []);
    // When
    const next = refreshCatalogSession(session, [product('new'), ...products.map(item => ({ ...item, price: 77 }))], []);
    // Then
    expect(next.items.findIndex(item => item.id === 'brand:Alpha')).toBe(6);
    expect(next.items.find(item => item.kind === 'brand')).toMatchObject({ products: [{ id: '0', price: 77 }, { id: '1', price: 77 }, { id: '2', price: 77 }] });
  });
});
