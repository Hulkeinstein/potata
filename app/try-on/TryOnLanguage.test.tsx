import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TryOnContent } from './TryOnContent';
const language = vi.hoisted(() => ({ locale: 'en' }));
vi.mock('@/components/providers/LanguageProvider', () => ({ useLanguage: () => language }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
it('translates an open empty gallery without starting an AI request', () => {
  // Given
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  const view = render(<TryOnContent products={[]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Gallery' }));
  // When
  language.locale = 'ko';
  view.rerender(<TryOnContent products={[]} />);
  // Then
  expect(screen.getByText('아직 생성된 이미지가 없습니다.')).toBeTruthy();
  expect(fetchSpy).not.toHaveBeenCalled();
});
it('translates category labels without resetting the selected category', () => {
  // Given
  language.locale = 'en';
  const view = render(<TryOnContent products={[]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Outer' }));
  // When
  language.locale = 'ko';
  view.rerender(<TryOnContent products={[]} />);
  // Then
  expect(screen.getByRole('button', { name: '아우터' }).className).toContain('bg-white');
});
