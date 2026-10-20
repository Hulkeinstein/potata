import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminProductEditForm } from './AdminProductEditForm';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back: vi.fn() }) }));
const product = { id: 'p', name: 'Name', brand: 'Brand', category: 'Top', price: 100, imageUrl: 'https://example.test/old.jpg', originalPrice: null, discountRate: null, isActive: true, description: null, variants: [] };
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('separate product image editing', () => {
  it('keeps the photo repair control available when the current URL is empty', () => {
    render(<AdminProductEditForm product={{ ...product, imageUrl: '' }} />);
    expect(screen.getByRole('button', { name: '대표 사진 저장' })).toBeTruthy();
    expect(screen.getByLabelText('새 대표 사진 선택')).toBeTruthy();
  });
  it('shows separate image action while preserving normal description inputs', () => {
    // Given:
    render(<AdminProductEditForm product={product} />);
    // When: edit page is rendered.
    // Then:
    expect(screen.getByRole('button', { name: '대표 사진 저장' })).toBeTruthy();
    expect(screen.getByLabelText('한국어 설명')).toBeTruthy();
  });
  it('does not send stale image fields through ordinary edit save and returns to selected list', async () => {
    // Given:
    const request = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', request);
    render(<AdminProductEditForm product={product} returnTo="/admin/products?brand=Brand&status=active" />);
    // When:
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    // Then:
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/products?brand=Brand&status=active'));
    const options: unknown = request.mock.calls[0]?.[1];
    if (!options || typeof options !== 'object') throw new Error('Missing request');
    const body: unknown = Reflect.get(options, 'body');
    if (typeof body !== 'string') throw new Error('Missing JSON');
    expect(JSON.parse(body)).not.toHaveProperty('imageUrl');
    expect(JSON.parse(body)).not.toHaveProperty('images');
  });
});
