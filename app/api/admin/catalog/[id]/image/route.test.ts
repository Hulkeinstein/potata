// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), admin: vi.fn(), get: vi.fn(), replace: vi.fn(), upload: vi.fn(), remove: vi.fn(), invalidate: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/admin', () => ({ isAdmin: mocks.admin }));
vi.mock('@/lib/admin-product-image', () => ({ getAdminProductImage: mocks.get, replaceAdminProductImage: mocks.replace }));
vi.mock('@/lib/supabase-storage', () => ({ uploadProductImage: mocks.upload, removeProductImagesByUrl: mocks.remove }));
vi.mock('next/cache', () => ({ revalidateTag: mocks.invalidate }));
import { POST } from './route';

const context = { params: Promise.resolve({ id: 'product' }) };
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]);
function request(file = new File([png], 'photo.png', { type: 'image/png' }), extra = false) {
  const body = new FormData();
  body.set('expectedImageUrl', 'old');
  body.append('image', file);
  if (extra) body.append('image', file);
  return new NextRequest('http://localhost/api/admin/catalog/product/image', { method: 'POST', body });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'admin', email: 'admin@example.test' } });
  mocks.admin.mockReturnValue(true);
  mocks.get.mockResolvedValue({ imageUrl: 'old' });
  mocks.replace.mockResolvedValue({ kind: 'saved', imageUrl: 'new' });
  mocks.upload.mockResolvedValue({ publicUrl: 'new' });
  mocks.remove.mockResolvedValue(undefined);
});

describe('admin representative image endpoint', () => {
  it.each([401, 403])('blocks unauthorized %s requests before upload', async (status) => {
    // Given:
    if (status === 401) mocks.auth.mockResolvedValue(null);
    else mocks.admin.mockReturnValue(false);
    // When:
    const response = await POST(request(), context);
    // Then:
    expect(response.status).toBe(status);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('returns 404 before upload for missing product', async () => {
    // Given:
    mocks.get.mockResolvedValue(null);
    // When:
    const response = await POST(request(), context);
    // Then:
    expect(response.status).toBe(404);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it.each(['spoof', 'multiple', 'large'])('rejects %s files before storage', async (kind) => {
    // Given:
    const file = kind === 'spoof' ? new File(['bad'], 'photo.png', { type: 'image/png' }) : kind === 'large' ? new File([new Uint8Array(3 * 1024 * 1024 + 1)], 'photo.png', { type: 'image/png' }) : undefined;
    // When:
    const response = await POST(request(file, kind === 'multiple'), context);
    // Then:
    expect([400, 413]).toContain(response.status);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('rejects actual oversized body without Content-Length', async () => {
    // Given:
    const raw = new NextRequest('http://localhost/api/admin/catalog/product/image', { method: 'POST', body: new Uint8Array(4 * 1024 * 1024 + 1), headers: { 'content-type': 'multipart/form-data; boundary=x' } });
    // When:
    const response = await POST(raw, context);
    // Then:
    expect(response.status).toBe(413);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('saves and expires customer catalog without deleting original file', async () => {
    // Given: valid admin image.
    // When:
    const response = await POST(request(), context);
    // Then:
    expect(response.status).toBe(200);
    expect(mocks.replace).toHaveBeenCalledWith('product', 'old', 'new');
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.invalidate).toHaveBeenCalledExactlyOnceWith('products', { expire: 0 });
  });
  it('cleans only newly uploaded file when compare-and-swap conflicts', async () => {
    // Given:
    mocks.replace.mockResolvedValue({ kind: 'conflict' });
    // When:
    const response = await POST(request(), context);
    // Then:
    expect(response.status).toBe(409);
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(['new']);
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it('returns generic failure and compensates a newly uploaded file on database failure', async () => {
    // Given:
    mocks.replace.mockRejectedValue(new Error('private connection details'));
    // When:
    const response = await POST(request(), context);
    // Then:
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('private');
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(['new']);
  });
  it('does not upload when expected representative was already replaced', async () => {
    // Given:
    mocks.get.mockResolvedValue({ imageUrl: 'other' });
    // When:
    const response = await POST(request(), context);
    // Then:
    expect(response.status).toBe(409);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('keeps original product unchanged when storage upload fails', async () => {
    // Given:
    mocks.upload.mockRejectedValue(new Error('secret token'));
    // When:
    const response = await POST(request(), context);
    // Then:
    expect(response.status).toBe(500);
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('reports sanitized cleanup warning without replacing the conflict response', async () => {
    // Given:
    mocks.replace.mockResolvedValue({ kind: 'conflict' });
    mocks.remove.mockRejectedValue(new Error('private storage credential'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // When:
    const response = await POST(request(), context);
    // Then:
    expect(response.status).toBe(409);
    expect(warn).toHaveBeenCalledExactlyOnceWith('[admin product image] uploaded-file cleanup failed', 'Error');
    warn.mockRestore();
  });
});
