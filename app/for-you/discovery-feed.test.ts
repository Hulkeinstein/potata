import { describe, expect, it } from 'vitest';
import type { Product } from '@/types';
import { buildDiscoveryFeed } from './discovery-feed';

const products: Product[] = Array.from({ length: 14 }, (_, index) => ({ id: String(index + 1), brand: index < 8 ? 'Alpha' : 'Beta', name: `Product ${index + 1}`, imageUrl: `/image-${index}.jpg`, price: 50 }));
describe('brand discovery schedule', () => {
  it('inserts one genuine brand after six products without changing product order', () => {
    // Given / When
    const items = buildDiscoveryFeed(products, []);
    // Then
    expect(items[6]).toMatchObject({ kind: 'brand', brand: 'Alpha' });
    expect(items[13]).toMatchObject({ kind: 'brand', brand: 'Beta' });
    expect(items.filter(item => item.kind === 'product').map(item => item.product.id)).toEqual(products.map(product => product.id));
  });
  it('never adds a trailing card or duplicates a brand', () => {
    // Given / When
    const items = buildDiscoveryFeed(products.slice(0, 12), []);
    // Then
    expect(items.at(-1)?.kind).toBe('product');
    expect(items.filter(item => item.kind === 'brand')).toHaveLength(1);
  });
  it('excludes dismissed and single-product brands without removing products', () => {
    // Given / When
    const items = buildDiscoveryFeed(products.slice(0, 9), ['Alpha']);
    // Then
    expect(items.every(item => item.kind === 'product')).toBe(true);
    expect(items).toHaveLength(9);
  });
  it('leaves a dismissed slot empty instead of replacing it with another brand', () => {
    // Given / When
    const items = buildDiscoveryFeed(products, ['Alpha']);
    // Then
    expect(items[6]).toMatchObject({ kind: 'product', product: { id: '7' } });
    expect(items[12]).toMatchObject({ kind: 'brand', brand: 'Beta' });
  });
  it('keeps nine products when the first of two eligible brands is dismissed', () => {
    // Given
    const catalog = products.slice(0, 9).map((product, index) => ({ ...product, brand: index < 4 ? 'Alpha' : 'Beta' }));
    // When
    const items = buildDiscoveryFeed(catalog, ['Alpha']);
    // Then
    expect(items).toHaveLength(9);
    expect(items[6]).toMatchObject({ kind: 'product', product: { id: '7' } });
  });
  it('uses only exact brand members for the two or three representative products', () => {
    // Given / When
    const item = buildDiscoveryFeed(products, []).find(entry => entry.kind === 'brand');
    // Then
    expect(item?.kind === 'brand' && item.products.map(product => product.id)).toEqual(['1', '2', '3']);
  });
  it.each([0, 1, 6])('does not insert a brand for %s products', count => {
    // Given / When / Then
    expect(buildDiscoveryFeed(products.slice(0, count), []).every(item => item.kind === 'product')).toBe(true);
  });
  it('deduplicates product identities before grouping and counting spacing', () => {
    // Given / When
    const items = buildDiscoveryFeed([...products.slice(0, 6), products[0]], []);
    // Then
    expect(items).toHaveLength(6);
  });
  it('rejects empty, one-letter and overly long search names', () => {
    // Given
    const invalid = products.map((product, index) => ({ ...product, brand: index < 5 ? ' ' : 'A' }));
    // When / Then
    expect(buildDiscoveryFeed(invalid, []).every(item => item.kind === 'product')).toBe(true);
  });
});
