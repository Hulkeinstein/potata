import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Product } from '@/types';
import { ForYouContent } from './ForYouContent';
vi.mock('@/components/ui/ProductCard', () => ({ ProductCard: ({ product }: { product: Product }) => <span>{product.name}</span> }));
vi.mock('@/components/common/HeartButton', () => ({ HeartButton: () => <button>Like</button> }));
const products: Product[] = Array.from({ length: 9 }, (_, index) => ({ id: String(index + 1), brand: 'Alpha', name: `Item ${index + 1}`, imageUrl: '/a.jpg', price: 50 }));
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(cleanup);
function openBrand() {
  render(<ForYouContent products={products} />);
  fireEvent.click(screen.getByRole('button', { name: 'Immersive view' }));
  for (let index = 0; index < 6; index += 1) fireEvent.click(screen.getByRole('button', { name: 'Next item' }));
}
it('opens a truthful brand card between products six and seven', () => {
  // Given / When
  openBrand();
  // Then
  expect(screen.getByRole('heading', { name: 'Alpha' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Search by brand name' }).getAttribute('href')).toBe('/search?q=Alpha');
});
it('keeps the previous product as the grid anchor while a brand is active', () => {
  // Given
  openBrand();
  // When
  fireEvent.click(screen.getByRole('button', { name: '← Grid view' }));
  // Then
  expect(document.querySelector('[data-current="true"]')?.getAttribute('data-product-id')).toBe('6');
});
it('hides a brand only for this session and continues with product seven', () => {
  // Given
  openBrand();
  // When
  fireEvent.click(screen.getByRole('button', { name: 'Not interested this session' }));
  // Then
  expect(screen.getByRole('heading', { name: 'Item 7' })).toBeTruthy();
  expect(document.querySelector('[data-brand-card]')).toBeNull();
  expect(JSON.parse(sessionStorage.getItem('potata-discovery-position') ?? '{}').dismissedBrands).toEqual(['Alpha']);
});
it('restores a brand slide from its stable saved identity', () => {
  // Given
  localStorage.setItem('potata-discovery-view', 'immersive');
  sessionStorage.setItem('potata-discovery-position', JSON.stringify({ category: 'All', productId: '6', photo: 0, feedId: 'brand:Alpha' }));
  // When
  render(<ForYouContent products={products} />);
  // Then
  expect(screen.getByRole('heading', { name: 'Alpha' })).toBeTruthy();
});
it('uses the newly focused grid product instead of an old brand anchor', () => {
  // Given
  openBrand();
  fireEvent.click(screen.getByRole('button', { name: '← Grid view' }));
  const card = document.querySelector('[data-product-id="8"]');
  if (!(card instanceof HTMLElement)) throw new Error('Missing grid card');
  fireEvent.focus(card);
  // When
  fireEvent.click(screen.getByRole('button', { name: 'Immersive view' }));
  // Then
  expect(screen.getByRole('heading', { name: 'Item 8' })).toBeTruthy();
});
it('falls forward to a valid product when a saved brand has disappeared', () => {
  // Given
  localStorage.setItem('potata-discovery-view', 'immersive');
  sessionStorage.setItem('potata-discovery-position', JSON.stringify({ category: 'All', productId: '6', photo: 0, feedId: 'brand:Removed' }));
  // When
  render(<ForYouContent products={products} />);
  // Then
  expect(screen.getByRole('heading', { name: 'Item 7' })).toBeTruthy();
});
it('canonicalizes a missing brand anchor instead of advancing on every reload', () => {
  // Given
  localStorage.setItem('potata-discovery-view', 'immersive');
  sessionStorage.setItem('potata-discovery-position', JSON.stringify({ category: 'All', productId: '6', photo: 0, feedId: 'brand:Removed' }));
  const result = render(<ForYouContent products={products} />);
  result.unmount();
  // When
  render(<ForYouContent products={products} />);
  // Then
  expect(screen.getByRole('heading', { name: 'Item 7' })).toBeTruthy();
  expect(JSON.parse(sessionStorage.getItem('potata-discovery-position') ?? '{}').feedId).toBe('product:7');
});
