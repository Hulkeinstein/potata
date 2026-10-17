import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ShopContent } from './ShopContent';
const language = vi.hoisted(() => ({ locale: 'en' }));
vi.mock('@/components/providers/LanguageProvider', () => ({ useLanguage: () => language }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
it('keeps the selected category while translating empty discovery chrome', () => {
  // Given
  const view = render(<ShopContent products={[]} />);
  fireEvent.click(screen.getByRole('tab', { name: 'Outer' }));
  // When
  language.locale = 'ko';
  view.rerender(<ShopContent products={[]} />);
  // Then
  expect(screen.getByRole('tab', { name: '아우터' }).getAttribute('aria-selected')).toBe('true');
  expect(screen.getByText('이 카테고리의 상품이 없습니다.')).toBeTruthy();
});
