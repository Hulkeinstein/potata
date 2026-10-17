import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ProductTagPicker } from './ProductTagPicker';
const language = vi.hoisted(() => ({ locale: 'en' }));
vi.mock('@/components/providers/LanguageProvider', () => ({ useLanguage: () => language }));
it('keeps a typed product search while translating picker feedback', () => {
  // Given
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  const view = render(<ProductTagPicker products={[]} selected={[]} onChange={() => undefined} />);
  const input = screen.getByPlaceholderText('Search products (brand or name)');
  fireEvent.change(input, { target: { value: 'My query' } });
  // When
  language.locale = 'ko';
  view.rerender(<ProductTagPicker products={[]} selected={[]} onChange={() => undefined} />);
  // Then
  expect(screen.getByPlaceholderText('상품 검색 (브랜드·이름)')).toHaveProperty('value', 'My query');
  expect(screen.getByText('검색 결과가 없어요. 다른 상품명이나 브랜드로 검색해보세요.')).toBeTruthy();
});
