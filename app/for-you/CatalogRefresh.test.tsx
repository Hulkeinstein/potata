import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Product } from '@/types';
import { ForYouContent } from './ForYouContent';
vi.mock('@/components/ui/ProductCard', () => ({ ProductCard: ({ product }: { product: Product }) => <span>{product.name}</span> }));
vi.mock('@/components/common/HeartButton', () => ({ HeartButton: () => <button>Like</button> }));
const item = (id: string): Product => ({ id, name: id, brand: 'Alpha', category: 'Top', price: 10, imageUrl: '/a.jpg' });
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(cleanup);
it('preserves current identity and grid ordering after new server props arrive', () => {
  // Given
  const view = render(<ForYouContent products={[item('a'), item('b'), item('c')]} />);
  const card = document.querySelector('[data-product-id="b"]');
  if (!card) throw new Error('Missing card');
  fireEvent.focus(card);
  // When
  view.rerender(<ForYouContent products={[item('new'), item('c'), { ...item('b'), name: 'Updated b' }, item('a')]} />);
  // Then
  expect([...document.querySelectorAll('[data-product-id]')].map(node => node.getAttribute('data-product-id'))).toEqual(['a', 'b', 'c', 'new']);
  expect(document.querySelector('[data-current="true"]')?.getAttribute('data-product-id')).toBe('b');
  expect(screen.getByText('Updated b')).toBeTruthy();
});
it('falls forward after deletion instead of restarting at the first product', () => {
  // Given
  const view = render(<ForYouContent products={[item('a'), item('b'), item('c')]} />);
  const card = document.querySelector('[data-product-id="b"]');
  if (!card) throw new Error('Missing card');
  fireEvent.focus(card);
  // When
  view.rerender(<ForYouContent products={[item('a'), item('c')]} />);
  // Then
  expect(document.querySelector('[data-current="true"]')?.getAttribute('data-product-id')).toBe('c');
});
it('stays at End until the reader chooses to continue into appended products', () => {
  // Given
  const view = render(<ForYouContent products={[item('a')]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Immersive view' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next product' }));
  // When
  view.rerender(<ForYouContent products={[item('new'), item('a')]} />);
  // Then
  expect(screen.getByRole('heading', { name: 'You have seen all current products.' })).toBeTruthy();
  expect(document.querySelectorAll('[data-feed-slide]')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Continue to new products' }));
  expect(screen.getByRole('heading', { name: 'new' })).toBeTruthy();
});
it('rebuilds from the latest catalog when the category changes', () => {
  // Given
  const view = render(<ForYouContent products={[item('a'), item('b')]} />);
  view.rerender(<ForYouContent products={[item('new'), item('b'), item('a')]} />);
  // When
  fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), { target: { value: 'Top' } });
  // Then
  expect([...document.querySelectorAll('[data-product-id]')].map(node => node.getAttribute('data-product-id'))).toEqual(['new', 'b', 'a']);
  expect(document.querySelector('[data-current="true"]')?.getAttribute('data-product-id')).toBe('new');
});
it('keeps the current brand anchored while refreshing its representative metadata', () => {
  // Given
  const products = Array.from({ length: 9 }, (_, index) => item(String(index)));
  const view = render(<ForYouContent products={products} />);
  fireEvent.click(screen.getByRole('button', { name: 'Immersive view' }));
  for (let index = 0; index < 6; index += 1) fireEvent.click(screen.getByRole('button', { name: 'Next item' }));
  // When
  view.rerender(<ForYouContent products={[item('new'), ...products]} />);
  // Then
  expect(screen.getByRole('heading', { name: 'Alpha' })).toBeTruthy();
  const ids = [...document.querySelectorAll('[data-feed-slide]')].map(node => node.getAttribute('data-feed-slide'));
  expect(ids.indexOf('brand:Alpha')).toBe(6);
});
it('observes newly appended grid cards and disconnects the previous observer', () => {
  // Given
  const observe = vi.fn<(node: Element) => void>();
  const disconnect = vi.fn();
  vi.stubGlobal('IntersectionObserver', class { observe = observe; disconnect = disconnect; });
  const view = render(<ForYouContent products={[item('a')]} />);
  observe.mockClear();
  // When
  view.rerender(<ForYouContent products={[item('new'), item('a')]} />);
  // Then
  expect(disconnect).toHaveBeenCalled();
  expect(observe.mock.calls.map(([node]) => node.getAttribute('data-product-id'))).toContain('new');
  view.unmount();
  vi.unstubAllGlobals();
});
