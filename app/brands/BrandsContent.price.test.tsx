import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrandsContent } from './BrandsContent';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import type { Product } from '@/types';
import type { Locale } from '@/lib/i18n/locale';

vi.mock('next/image', () => ({ default: ({ alt }: { readonly alt: string }) => <span role="img" aria-label={alt} /> }));
const product = { id: 'price-fixture', name: 'Price fixture jacket', brand: 'Potata', price: 719, imageUrl: '/jacket.jpg' } satisfies Product;
afterEach(cleanup);

describe('Brands product AED prices', () => {
  it.each<Locale>(['en', 'ko'])('shows the stored AED price and real original price in %s', (locale) => {
    // Given
    const discounted = { ...product, originalPrice: 779 };
    // When
    render(<LanguageProvider initialLocale={locale}><BrandsContent products={[discounted]} /></LanguageProvider>);
    // Then
    const card = screen.getByRole('link', { name: /Price fixture jacket/ });
    expect(within(card).getByText('AED 719')).toBeTruthy();
    expect(within(card).getByText('AED 779').classList.contains('line-through')).toBe(true);
  });

  it('does not invent an original price when it is absent', () => {
    // Given / When
    render(<BrandsContent products={[product]} />);
    // Then
    const card = screen.getByRole('link', { name: /Price fixture jacket/ });
    expect(within(card).getByText('AED 719')).toBeTruthy();
    expect(card.querySelector('.line-through')).toBeNull();
  });

  it.each([0, 700, 719])('does not mark a non-higher original price %s as a discount', (originalPrice) => {
    // Given / When
    render(<BrandsContent products={[{ ...product, originalPrice }]} />);
    // Then
    expect(screen.getByRole('link', { name: /Price fixture jacket/ }).querySelector('.line-through')).toBeNull();
  });

  it('preserves zero AED rather than rendering a numeric conditional', () => {
    // Given / When
    render(<BrandsContent products={[{ ...product, price: 0, originalPrice: 0 }]} />);
    // Then
    const card = screen.getByRole('link', { name: /Price fixture jacket/ });
    expect(within(card).getByText('AED 0')).toBeTruthy();
    expect(card.querySelector('.line-through')).toBeNull();
  });
});
