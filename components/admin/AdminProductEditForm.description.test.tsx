import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminProductEditForm } from './AdminProductEditForm';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back: vi.fn() }) }));
beforeEach(() => { vi.clearAllMocks(); });
describe('admin product description editing', () => {
  it('submits both language fields while preserving the original description', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', request);
    render(<AdminProductEditForm product={{ id: 'product', name: 'Name', brand: 'Brand', category: 'Top', price: 100, originalPrice: null, discountRate: null, isActive: true, description: 'legacy', descriptionKo: '한국어', descriptionEn: 'English', variants: [] }} />);
    expect(screen.getByText('legacy')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('한국어 설명'), { target: { value: '새 설명' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/products'));
    const options: unknown = request.mock.calls[0]?.[1];
    if (!options || typeof options !== 'object') throw new Error('Missing request');
    const body: unknown = Reflect.get(options, 'body');
    if (typeof body !== 'string') throw new Error('Missing body');
    expect(JSON.parse(body)).toMatchObject({ description: 'legacy', descriptionKo: '새 설명', descriptionEn: 'English' });
    vi.unstubAllGlobals();
  });
});
