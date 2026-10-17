import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { SearchContent } from './SearchContent';
const language = vi.hoisted(() => ({ locale: 'en' }));
vi.mock('@/components/providers/LanguageProvider', () => ({ useLanguage: () => language }));
it('translates search feedback without translating the user query', () => {
  // Given
  const view = render(<SearchContent query="Original Query" products={[]} />);
  expect(screen.getByText(/No results for/)).toBeTruthy();
  // When
  language.locale = 'ko';
  view.rerender(<SearchContent query="Original Query" products={[]} />);
  // Then
  expect(screen.getByText('검색 결과가 없습니다: "Original Query"')).toBeTruthy();
});
