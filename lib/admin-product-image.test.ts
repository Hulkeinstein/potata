import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ findUnique: vi.fn(), updateMany: vi.fn(), transaction: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { product: { findUnique: db.findUnique }, $transaction: db.transaction } }));
import { replaceAdminProductImage } from './admin-product-image';

beforeEach(() => {
  vi.clearAllMocks();
  db.transaction.mockImplementation(async (run) => run({ product: { findUnique: db.findUnique, updateMany: db.updateMany } }));
  db.findUnique.mockResolvedValue({ imageUrl: 'old', images: ['old', 'detail', 'old', 'detail2'] });
  db.updateMany.mockResolvedValue({ count: 1 });
});

describe('representative image compare-and-swap', () => {
  it('updates only image fields and preserves detail order when expected image matches', async () => {
    // Given: an existing representative and detail images.
    // When:
    const result = await replaceAdminProductImage('product', 'old', 'new');
    // Then:
    expect(result).toEqual({ kind: 'saved', imageUrl: 'new' });
    expect(db.updateMany).toHaveBeenCalledWith({ where: { id: 'product', imageUrl: 'old' }, data: { imageUrl: 'new', images: ['new', 'detail', 'detail2'] } });
  });
  it('does not write when the expected image is stale', async () => {
    // Given:
    db.findUnique.mockResolvedValue({ imageUrl: 'other', images: ['other'] });
    // When:
    const result = await replaceAdminProductImage('product', 'old', 'new');
    // Then:
    expect(result).toEqual({ kind: 'conflict' });
    expect(db.updateMany).not.toHaveBeenCalled();
  });
  it('returns conflict when a concurrent update wins the compare-and-swap', async () => {
    // Given:
    db.updateMany.mockResolvedValue({ count: 0 });
    // When:
    const result = await replaceAdminProductImage('product', 'old', 'new');
    // Then:
    expect(result).toEqual({ kind: 'conflict' });
  });
  it('returns missing without mutation when the product was removed', async () => {
    // Given:
    db.findUnique.mockResolvedValue(null);
    // When:
    const result = await replaceAdminProductImage('product', 'old', 'new');
    // Then:
    expect(result).toEqual({ kind: 'missing' });
    expect(db.updateMany).not.toHaveBeenCalled();
  });
});
