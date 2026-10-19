import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ForYouContent } from './ForYouContent';

vi.mock('@/components/ui/ProductCard', () => ({ ProductCard: () => <span>Grid product</span> }));
vi.mock('@/components/common/HeartButton', () => ({ HeartButton: () => <button>Like</button> }));
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(cleanup);
const products = [
  { id: 'a', brand: 'A', name: 'Alpha', category: 'Top' as const, price: 50, imageUrl: '/a.jpg' },
  { id: 'b', brand: 'B', name: 'Beta', category: 'Top' as const, price: 80, imageUrl: '/b.jpg' },
];
it('renders continuous slides in a full-screen dialog when immersion opens', () => {
  // Given
  render(<ForYouContent products={products} />);
  // When
  fireEvent.click(screen.getByRole('button', { name: 'Immersive view' }));
  // Then
  expect(screen.getByRole('dialog', { name: 'Immersive view' })).toBeTruthy();
  expect(document.querySelectorAll('[data-feed-slide]')).toHaveLength(3);
  expect(document.body.style.overflow).toBe('hidden');
});
it('restores page scroll locking when immersion is unmounted', () => {
  // Given
  document.body.style.overflow = 'clip';
  const result = render(<ForYouContent products={products} />);
  fireEvent.click(screen.getByRole('button', { name: 'Immersive view' }));
  // When
  result.unmount();
  // Then
  expect(document.body.style.overflow).toBe('clip');
  document.body.style.overflow = '';
});
it('restores page scrolling when a nested footer is unmounted with the feed', () => {
  // Given
  const result = render(<ForYouContent products={products} />);
  fireEvent.click(screen.getByRole('button', { name: 'Immersive view' }));
  fireEvent.click(screen.getByRole('button', { name: 'Language & footer' }));
  // When
  result.unmount();
  // Then
  expect(document.body.style.overflow).toBe('');
});
it('keeps each product photo when returning from another product', () => {
  // Given
  render(<ForYouContent products={[{ ...products[0], images: ['/a2.jpg'] }, products[1]]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Immersive view' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next product' }));
  // When
  fireEvent.click(screen.getByRole('button', { name: 'Previous product' }));
  // Then
  expect(screen.getByRole('img').getAttribute('alt')).toBe('Alpha — Photo 2');
  expect(JSON.parse(sessionStorage.getItem('potata-discovery-position') ?? '{}').photos.a).toBe(1);
});
it('can escape an empty filtered feed without a product', () => {
  // Given
  render(<ForYouContent products={products} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), { target: { value: 'Dress' } });
  fireEvent.click(screen.getByRole('button', { name: 'Immersive view' }));
  // When
  const dialog = screen.getByRole('dialog');
  fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
  // Then
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.body.style.overflow).toBe('');
});
it('changes the current photo with a horizontal arrow on the feed', () => {
  // Given
  render(<ForYouContent products={[{ ...products[0], images: ['/a2.jpg'] }]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Immersive view' }));
  const track = document.querySelector('[data-feed-track]');
  if (!(track instanceof HTMLElement)) throw new Error('Missing track');
  // When
  fireEvent.keyDown(track, { key: 'ArrowRight' });
  // Then
  expect(screen.getByRole('img').getAttribute('alt')).toBe('Alpha — Photo 2');
});
