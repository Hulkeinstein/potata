// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadEnvConfig } from '@next/env';
import { prisma } from '@/lib/prisma';
import { replaceAdminProductImage } from './admin-product-image';

const run = process.env.RUN_INTEGRATION === '1';
const fixtureId = `image-replacement-${crypto.randomUUID()}`;
let fixtureUserId = '';
let fixtureCreated = false;

beforeAll(async () => {
  if (!run) return;
  loadEnvConfig(process.cwd());
  const url = new URL(process.env.DATABASE_URL ?? 'http://invalid');
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/potata_dev') throw new Error('Image integration requires local potata_dev only.');
  await prisma.product.create({ data: { id: fixtureId, name: 'Disposable image QA', brand: 'QA', price: 123, imageUrl: 'https://example.test/old.png', images: ['https://example.test/old.png', 'https://example.test/detail.png'], category: 'Top', descriptionKo: '원문', variants: { create: { size: 'M', color: 'Black', stock: 7, isManuallySoldOut: true } } } });
  fixtureCreated = true;
  const user = await prisma.user.create({ data: { email: `${fixtureId}@example.test`, name: 'Disposable QA' } });
  fixtureUserId = user.id;
  await prisma.wishlistItem.create({ data: { userId: user.id, productId: fixtureId } });
  await prisma.review.create({ data: { userId: user.id, productId: fixtureId, rating: 5, comment: 'Preserve this relation' } });
});

afterAll(async () => {
  if (!run) return;
  if (fixtureCreated) await prisma.product.delete({ where: { id: fixtureId } });
  if (fixtureUserId) await prisma.user.delete({ where: { id: fixtureUserId } });
  await prisma.$disconnect();
});

describe.skipIf(!run)('local database representative replacement', () => {
  it('preserves identity, relations, detail images, descriptions and stock', async () => {
    // Given:
    const before = await prisma.product.findUniqueOrThrow({ where: { id: fixtureId }, include: { variants: true, reviews: true, wishlistItems: true } });
    // When:
    const result = await replaceAdminProductImage(fixtureId, before.imageUrl, 'https://example.test/new.png');
    // Then:
    const after = await prisma.product.findUniqueOrThrow({ where: { id: fixtureId }, include: { variants: true, reviews: true, wishlistItems: true } });
    expect(result.kind).toBe('saved');
    expect(after).toMatchObject({ id: before.id, name: before.name, price: before.price, descriptionKo: '원문', imageUrl: 'https://example.test/new.png', images: ['https://example.test/new.png', 'https://example.test/detail.png'] });
    expect(after.variants).toEqual(before.variants);
    expect(after.reviews).toEqual(before.reviews);
    expect(after.wishlistItems).toEqual(before.wishlistItems);
  });
  it('allows only one winner in concurrent replacements', async () => {
    // Given:
    const before = await prisma.product.findUniqueOrThrow({ where: { id: fixtureId } });
    // When:
    const results = await Promise.all([replaceAdminProductImage(fixtureId, before.imageUrl, 'https://example.test/a.png'), replaceAdminProductImage(fixtureId, before.imageUrl, 'https://example.test/b.png')]);
    // Then:
    expect(results.map((result) => result.kind).sort()).toEqual(['conflict', 'saved']);
  });
});
