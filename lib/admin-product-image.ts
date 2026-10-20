import 'server-only';
import { prisma } from '@/lib/prisma';

export type ProductImageReplacement =
  | { readonly kind: 'saved'; readonly imageUrl: string }
  | { readonly kind: 'missing' }
  | { readonly kind: 'conflict' };

export function getAdminProductImage(id: string) {
  return prisma.product.findUnique({ where: { id }, select: { imageUrl: true } });
}

export async function replaceAdminProductImage(id: string, expectedImageUrl: string, imageUrl: string): Promise<ProductImageReplacement> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.product.findUnique({ where: { id }, select: { imageUrl: true, images: true } });
    if (!current) return { kind: 'missing' };
    if (current.imageUrl !== expectedImageUrl) return { kind: 'conflict' };
    // 이전 파일은 주문 snapshot에서도 참조할 수 있어 Storage에서 삭제하지 않는다.
    const images = [imageUrl, ...current.images.filter((url) => url !== current.imageUrl)];
    const updated = await tx.product.updateMany({ where: { id, imageUrl: expectedImageUrl }, data: { imageUrl, images } });
    return updated.count === 1 ? { kind: 'saved', imageUrl } : { kind: 'conflict' };
  });
}
