import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ForYouContent } from './ForYouContent';
import type { Product } from '@/types';
import { PAGE_METADATA } from '@/lib/metadata';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import { Footer } from '@/components/ui/Footer';

vi.mock('@/components/ui/ProductCard', () => ({ ProductCard: ({ product }: { product: Product }) => <a href={`/product/${product.id}`}>{product.name}</a> }));
vi.mock('@/components/common/HeartButton', () => ({ HeartButton: () => <button>Like</button> }));
vi.mock('next/image', () => ({ default: ({ alt, onError }: { alt: string; onError?: () => void }) => createElement('img', { alt, onError }) }));

const products: Product[] = [
  { id: 'one', brand: 'A', name: 'First shirt', category: 'Top', price: 50, imageUrl: '/one.jpg', images: ['/two.jpg'] },
  { id: 'two', brand: 'B', name: 'Second coat', category: 'Outer', price: 80, imageUrl: '/coat.jpg' },
];
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(cleanup);
describe('For You view choice', () => {
  it('describes catalog discovery rather than fabricated AI personalization in metadata', () => {
    // Given / When / Then
    expect(PAGE_METADATA.forYou.description).not.toMatch(/personalized|AI|curated just for you/i);
  });
  it('restores a valid saved mode and position', () => {
    // Given
    localStorage.setItem('potata-discovery-view', 'immersive');
    sessionStorage.setItem('potata-discovery-position', JSON.stringify({ category: 'All', productId: 'two', photo: 0 }));
    // When
    render(<ForYouContent products={products} />);
    // Then
    expect(screen.getByRole('heading', { name: 'Second coat' })).toBeTruthy();
  });
  it('ignores invalid saved values and unavailable products', () => {
    // Given
    localStorage.setItem('potata-discovery-view', 'invalid');
    sessionStorage.setItem('potata-discovery-position', '{broken');
    // When
    render(<ForYouContent products={products} />);
    // Then
    expect(screen.getByRole('button', { name: 'Grid view' }).getAttribute('aria-pressed')).toBe('true');
  });
  it('keeps the photo when switching through the grid', () => {
    // Given
    render(<ForYouContent products={products} />);
    fireEvent.click(screen.getByRole('button', { name: 'Immersive view' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Grid view' }));
    // When
    fireEvent.click(screen.getByRole('button', { name: 'Immersive view' }));
    // Then
    expect(screen.getByRole('img').getAttribute('alt')).toContain('Photo 2');
  });
  it('starts with the normal catalog instead of fabricated personalization', () => {
    // Given / When
    render(<ForYouContent products={products} />);
    // Then
    expect(screen.getByRole('button', { name: 'Grid view' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByText(/Sarah|12 viewed/)).toBeNull();
  });
  it('keeps the current item when switching back from immersion', () => {
    // Given
    render(<ForYouContent products={products} />);
    fireEvent.click(screen.getByRole('button', { name: 'Immersive view' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next product' }));
    // When
    fireEvent.click(screen.getByRole('button', { name: 'Grid view' }));
    // Then
    expect(document.querySelector('[data-current="true"]')?.getAttribute('data-product-id')).toBe('two');
    expect(localStorage.getItem('potata-discovery-view')).toBe('grid');
  });
  it('shows an honest end and does not wrap to duplicate products', () => {
    // Given
    render(<ForYouContent products={[products[0]]} />);
    // When
    fireEvent.click(screen.getByRole('button', { name: 'Immersive view' }));
    // Then
    fireEvent.click(screen.getByRole('button', { name: 'Next product' }));
    expect(screen.getByRole('heading', { name: 'You have seen all current products.' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next product' }).hasAttribute('disabled')).toBe(true);
  });
  it('handles an empty catalog', () => {
    // Given / When
    render(<ForYouContent products={[]} />);
    // Then
    expect(screen.getByText('No products match these filters.')).toBeTruthy();
  });
  it('preserves category when the shared Footer changes language', () => {
    // Given
    render(<LanguageProvider initialLocale="en"><ForYouContent products={products} /><Footer /></LanguageProvider>);
    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), { target: { value: 'Outer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Immersive view' }));
    // When
    fireEvent.change(within(screen.getByRole('dialog')).getByRole('combobox', { name: 'Language / 언어' }), { target: { value: 'ko' } });
    // Then
    expect(screen.getByRole('heading', { name: 'Second coat' })).toBeTruthy();
    expect(within(screen.getByRole('dialog')).getByRole('option', { name: '아우터' }).getAttribute('value')).toBe('Outer');
    expect(screen.getByRole('button', { name: '몰입 보기' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('heading', { name: 'First shirt' })).toBeNull();
  });
  it('moves by keyboard without moving focus to the document body', () => {
    // Given
    render(<ForYouContent products={products} />);
    fireEvent.click(screen.getByRole('button', { name: 'Immersive view' }));
    const panel = document.querySelector('[data-feed-track]');
    if (!(panel instanceof HTMLElement)) throw new Error('Missing feed track');
    panel.focus();
    // When
    fireEvent.keyDown(panel, { key: 'ArrowDown' });
    // Then
    expect(document.activeElement).toBe(panel);
    expect(screen.getByRole('heading', { name: 'Second coat' })).toBeTruthy();
  });
  it('replaces a failed image with the visible fallback', () => {
    // Given
    render(<ForYouContent products={products} />);
    fireEvent.click(screen.getByRole('button', { name: 'Immersive view' }));
    // When
    fireEvent.error(screen.getByRole('img'));
    // Then
    expect(screen.getByText('Image unavailable')).toBeTruthy();
  });
});
