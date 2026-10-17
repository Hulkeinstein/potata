import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), admin: vi.fn(), update: vi.fn(), get: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/admin', () => ({ isAdmin: mocks.admin }));
vi.mock('@/lib/admin-product-catalog', () => ({ updateAdminProduct: mocks.update, getAdminProduct: mocks.get }));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));
import { PATCH } from './route';

const base = { name: 'Name', brand: 'Brand', category: 'Top', price: 100, originalPrice: null, discountRate: null, isActive: true };
const context = { params: Promise.resolve({ id: 'product' }) };
function request(body: unknown) {
  return new NextRequest('http://localhost/api/admin/catalog/product', { method: 'PATCH', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'admin', email: 'admin@test.com' } });
  mocks.admin.mockReturnValue(true);
  mocks.update.mockResolvedValue({ id: 'product' });
});
describe('admin description update', () => {
  it('saves language fields without clearing omitted legacy data', async () => {
    const response = await PATCH(request({ ...base, descriptionKo: ' 한국어 ', descriptionEn: 'English' }), context);
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith('product', { ...base, descriptionKo: '한국어', descriptionEn: 'English' });
  });
  it('rejects object and overlength descriptions before database mutation', async () => {
    const response = await PATCH(request({ ...base, descriptionKo: { value: 'not text' } }), context);
    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('clears only an explicitly blank language field', async () => {
    await PATCH(request({ ...base, descriptionKo: '  ' }), context);
    expect(mocks.update).toHaveBeenCalledWith('product', { ...base, descriptionKo: null });
  });
  it('blocks a non-admin before parsing or writing descriptions', async () => {
    mocks.admin.mockReturnValue(false);
    const response = await PATCH(request({ ...base, descriptionEn: 'English' }), context);
    expect(response.status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
