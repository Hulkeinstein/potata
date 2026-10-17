import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider, useLanguage } from '@/components/providers/LanguageProvider';
import { ProductDetailClient } from './ProductDetailClient';
import type { Product } from '@/types';

vi.mock('next/image', () => ({ default: ({ alt }: { readonly alt: string }) => <span>{alt}</span> }));
vi.mock('@/components/product/ProductPurchaseActions', () => ({ ProductPurchaseActions: () => null }));
vi.mock('@/components/product/ReviewSection', () => ({ ReviewSection: () => null }));
vi.mock('@/components/product/QASection', () => ({ QASection: () => null }));
const product: Product = { id: 'description-test', name: 'Original name', brand: 'Brand', price: 100, imageUrl: '/image.jpg', description: 'legacy', descriptionKo: '한국어 설명입니다', descriptionEn: 'English description' };
function ChangeLanguage() {
  const { setLocale } = useLanguage();
  return <button onClick={() => setLocale('ko')}>Switch to Korean</button>;
}
describe('product description rendering', () => {
  it('changes the description in place when the language changes', () => {
    render(<LanguageProvider initialLocale="en"><ChangeLanguage /><ProductDetailClient product={product} /></LanguageProvider>);
    expect(screen.getByText('English description')).toBeTruthy();
    fireEvent.click(screen.getByText('Switch to Korean'));
    expect(screen.getByText('한국어 설명입니다')).toBeTruthy();
    expect(screen.queryByText('English description')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Original name' })).toBeTruthy();
  });
  it('shows the true source language for missing translation', () => {
    render(<LanguageProvider initialLocale="ko"><ProductDetailClient product={{ ...product, descriptionKo: undefined }} /></LanguageProvider>);
    expect(screen.getByText('English description').getAttribute('lang')).toBe('en');
    expect(screen.getByText('영어 원문 — 한국어 번역이 아직 없습니다.')).toBeTruthy();
  });
  it('does not label an unknown legacy description as Korean or English', () => {
    render(<LanguageProvider initialLocale="en"><ProductDetailClient product={{ ...product, descriptionKo: undefined, descriptionEn: undefined }} /></LanguageProvider>);
    expect(screen.getByText('legacy').hasAttribute('lang')).toBe(false);
    expect(screen.getByText('Original description — language not specified.')).toBeTruthy();
  });
});
