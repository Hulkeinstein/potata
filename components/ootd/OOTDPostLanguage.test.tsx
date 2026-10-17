import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { OOTDPostForm } from './OOTDPostForm';
const language = vi.hoisted(() => ({ locale: 'en' }));
vi.mock('@/components/providers/LanguageProvider', () => ({ useLanguage: () => language }));
beforeEach(() => {
  language.locale = 'en';
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
});
it('keeps selected local files and an unsaved caption when switching languages', () => {
  // Given
  const props = { products: [], onClose: vi.fn(), onPosted: vi.fn() };
  const view = render(<OOTDPostForm {...props} />);
  fireEvent.change(screen.getByLabelText('Photos (up to 5)'), { target: { files: [new File(['image'], 'look.jpg', { type: 'image/jpeg' })] } });
  fireEvent.change(screen.getByLabelText('Describe this look...'), { target: { value: '원문 caption' } });
  // When
  language.locale = 'ko';
  view.rerender(<OOTDPostForm {...props} />);
  // Then
  expect(screen.getByLabelText('이 착장을 설명해보세요...')).toHaveProperty('value', '원문 caption');
  expect(screen.getByText('1 장 선택됨')).toBeTruthy();
  expect(props.onPosted).not.toHaveBeenCalled();
});
it('translates local file type feedback without sending an upload', () => {
  // Given
  const view = render(<OOTDPostForm products={[]} onClose={vi.fn()} onPosted={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Photos (up to 5)'), { target: { files: [new File(['text'], 'look.txt', { type: 'text/plain' })] } });
  // When
  language.locale = 'ko';
  view.rerender(<OOTDPostForm products={[]} onClose={vi.fn()} onPosted={vi.fn()} />);
  // Then
  expect(screen.getByText('jpg/png/webp 이미지만 올릴 수 있어요.')).toBeTruthy();
});
