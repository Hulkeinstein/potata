import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminProductImageEditor } from './AdminProductImageEditor';

const request = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', request);
  request.mockReset();
  URL.createObjectURL = vi.fn().mockReturnValue('blob:preview');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function selectPhoto() {
  fireEvent.change(screen.getByLabelText('새 대표 사진 선택'), { target: { files: [new File(['photo'], 'photo.png', { type: 'image/png' })] } });
}
describe('representative photo editing', () => {
  it('disables photo actions when ordinary product save is in progress', () => {
    // Given:
    const { rerender } = render(<AdminProductImageEditor productId="p" imageUrl="https://example.test/old.jpg" />);
    selectPhoto();
    // When:
    rerender(<AdminProductImageEditor productId="p" imageUrl="https://example.test/old.jpg" disabled />);
    // Then:
    expect(screen.getByLabelText('새 대표 사진 선택').hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: '대표 사진 저장' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: '사진 선택 취소' }).hasAttribute('disabled')).toBe(true);
  });
  it('clears an earlier preview when a later selection is invalid', () => {
    // Given:
    render(<AdminProductImageEditor productId="p" imageUrl="https://example.test/old.jpg" />);
    selectPhoto();
    // When:
    fireEvent.change(screen.getByLabelText('새 대표 사진 선택'), { target: { files: [new File(['bad'], 'photo.svg', { type: 'image/svg+xml' })] } });
    // Then:
    expect(screen.queryByAltText('저장 전 대표 사진 미리보기')).toBeNull();
    expect(screen.getByRole('button', { name: '대표 사진 저장' }).hasAttribute('disabled')).toBe(true);
  });
  it('previews without saving until explicit confirmation', () => {
    // Given:
    render(<AdminProductImageEditor productId="p" imageUrl="https://example.test/old.jpg" />);
    // When:
    selectPhoto();
    // Then:
    expect(screen.getByAltText('저장 전 대표 사진 미리보기').getAttribute('src')).toBe('blob:preview');
    expect(request).not.toHaveBeenCalled();
  });
  it('saves with expected representative and announces persisted success', async () => {
    // Given:
    request.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { imageUrl: 'https://example.test/new.jpg' } }) });
    render(<AdminProductImageEditor productId="p" imageUrl="https://example.test/old.jpg" />);
    selectPhoto();
    // When:
    fireEvent.click(screen.getByRole('button', { name: '대표 사진 저장' }));
    // Then:
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('저장했습니다'));
    const options: unknown = request.mock.calls[0]?.[1];
    if (!options || typeof options !== 'object') throw new Error('Missing request');
    const body: unknown = Reflect.get(options, 'body');
    expect(body).toBeInstanceOf(FormData);
    if (!(body instanceof FormData)) throw new Error('Missing multipart');
    expect(body.get('expectedImageUrl')).toBe('https://example.test/old.jpg');
    expect(screen.getByAltText('현재 대표 사진').getAttribute('src')).toBe('https://example.test/new.jpg');
  });
  it('cancels only preview without changing original or sending request', () => {
    // Given:
    render(<AdminProductImageEditor productId="p" imageUrl="https://example.test/old.jpg" />);
    selectPhoto();
    // When:
    fireEvent.click(screen.getByRole('button', { name: '사진 선택 취소' }));
    // Then:
    expect(screen.getByAltText('현재 대표 사진').getAttribute('src')).toBe('https://example.test/old.jpg');
    expect(request).not.toHaveBeenCalled();
  });
  it('retains selection and shows refresh guidance for concurrent change', async () => {
    // Given:
    request.mockResolvedValue({ ok: false, status: 409 });
    render(<AdminProductImageEditor productId="p" imageUrl="https://example.test/old.jpg" />);
    selectPhoto();
    // When:
    fireEvent.click(screen.getByRole('button', { name: '대표 사진 저장' }));
    // Then:
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('새로고침'));
    expect(screen.getByAltText('저장 전 대표 사진 미리보기')).toBeTruthy();
  });
  it('restores submit after network failure', async () => {
    // Given:
    request.mockRejectedValue(new TypeError('offline'));
    render(<AdminProductImageEditor productId="p" imageUrl="https://example.test/old.jpg" />);
    selectPhoto();
    // When:
    fireEvent.click(screen.getByRole('button', { name: '대표 사진 저장' }));
    // Then:
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('button', { name: '대표 사진 저장' }).hasAttribute('disabled')).toBe(false);
  });
});
