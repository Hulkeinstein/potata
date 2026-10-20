import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Product } from '@/types';
import { ProductPurchaseActions } from './ProductPurchaseActions';
vi.mock('next-auth/react', () => ({ useSession: () => ({ status: 'authenticated', data: { user: { id: 'u1' } } }) }));
vi.mock('@/components/common/HeartButton', () => ({ HeartButton: () => <button>Like</button> }));
const product: Product = { id: 'p1', brand: 'A', name: 'Shirt', price: 50, imageUrl: '/a.jpg', sizes: ['S', 'M'], colors: ['Black'] };
beforeEach(() => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { preferredSize: 'S' } }) })); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('preserves the user size and quantity when refreshed props arrive', async () => {
  // Given
  const view = render(<ProductPurchaseActions product={product} imageUrl={product.imageUrl} />);
  await act(async () => {});
  fireEvent.click(screen.getByRole('button', { name: 'M' }));
  fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));
  // When
  view.rerender(<ProductPurchaseActions product={{ ...product, sizes: ['S', 'M'], price: 70 }} imageUrl={product.imageUrl} />);
  await act(async () => {});
  // Then
  expect(screen.getByRole('button', { name: 'M' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText('AED 140')).toBeTruthy();
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('does not purchase an option removed by a product update', async () => {
  // Given
  const view = render(<ProductPurchaseActions product={product} imageUrl={product.imageUrl} />);
  await act(async () => {});
  fireEvent.click(screen.getByRole('button', { name: 'M' }));
  // When
  view.rerender(<ProductPurchaseActions product={{ ...product, sizes: ['S'] }} imageUrl={product.imageUrl} />);
  // Then
  expect(screen.getByRole('button', { name: 'Out of Stock' }).hasAttribute('disabled')).toBe(true);
});
it('does not overwrite a size chosen before the saved preference arrives', async () => {
  // Given
  let deliver: ((response: Response) => void) | undefined;
  vi.mocked(fetch).mockImplementation(() => new Promise(resolve => { deliver = resolve; }));
  render(<ProductPurchaseActions product={product} imageUrl={product.imageUrl} />);
  fireEvent.click(screen.getByRole('button', { name: 'M' }));
  // When
  await act(async () => { deliver?.(new Response(JSON.stringify({ success: true, data: { preferredSize: 'S' } }))); });
  // Then
  expect(screen.getByRole('button', { name: 'M' }).getAttribute('aria-pressed')).toBe('true');
  expect(document.querySelector('[data-catalog-refresh-blocked="true"]')).toBeTruthy();
});
