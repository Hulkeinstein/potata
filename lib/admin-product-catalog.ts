import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { AdminCatalogQuery } from "./admin-catalog-query";
import { matchesProductContentQuality } from "./product-content-quality";
export { parseAdminCatalogQuery } from "./admin-catalog-query";
export type { AdminCatalogQuery } from "./admin-catalog-query";

export type AdminCatalogProduct = Prisma.ProductGetPayload<{ include: { variants: true } }>;

export type AdminCatalogPage = {
  readonly items: readonly AdminCatalogProduct[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
};

export async function listAdminProducts(input: Pick<AdminCatalogQuery, "query" | "page" | "pageSize"> & Partial<AdminCatalogQuery>): Promise<AdminCatalogPage> {
  const available = { stock: { gt: 0 }, isManuallySoldOut: false };
  const baseWhere: Prisma.ProductWhereInput = {
    ...(input.query ? { OR: [{ name: { contains: input.query, mode: "insensitive" } }, { brand: { contains: input.query, mode: "insensitive" } }] } : {}),
    ...(input.brand ? { brand: input.brand } : {}),
    ...(input.category ? { category: input.category } : {}),
    ...(input.status === "active" ? { isActive: true, variants: { some: available } } : {}),
    ...(input.status === "sold-out" ? { isActive: true, variants: { none: available } } : {}),
    ...(input.status === "inactive" ? { isActive: false } : {}),
  };
  const quality = input.quality ?? "all";
  // 누락 필터에서만 후보의 작은 facts를 읽고, 공통 trim 규칙을 pagination 전에 적용한다.
  const candidates = quality === "all" ? undefined : await prisma.product.findMany({
    where: baseWhere, select: { id: true, descriptionKo: true, descriptionEn: true, imageUrl: true },
  });
  const where: Prisma.ProductWhereInput = candidates
    ? { AND: [baseWhere, { id: { in: candidates.filter((product) => matchesProductContentQuality(product, quality)).map(({ id }) => id) } }] }
    : baseWhere;
  const sort = input.sort ?? "newest";
  const orders = {
    newest: { createdAt: "desc" }, name: { name: "asc" },
    "price-asc": { price: "asc" }, "price-desc": { price: "desc" },
  } satisfies Record<AdminCatalogQuery["sort"], Prisma.ProductOrderByWithRelationInput>;
  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({ where, include: { variants: true }, orderBy: [orders[sort], { id: "asc" }], skip: (input.page - 1) * input.pageSize, take: input.pageSize }),
    prisma.product.count({ where }),
  ]);
  return { items, total, page: input.page, pageSize: input.pageSize };
}

export async function updateAdminProductStatus(id: string, isActive: boolean): Promise<boolean> {
  return (await updateAdminProductStatuses([id], isActive)) === 1;
}

class MissingStatusProductsError extends Error {}

export async function updateAdminProductStatuses(ids: readonly string[], isActive: boolean): Promise<number> {
  try {
    return await prisma.$transaction(async (tx) => {
      const result = await tx.product.updateMany({ where: { id: { in: [...ids] } }, data: { isActive } });
      if (result.count !== ids.length) throw new MissingStatusProductsError();
      return result.count;
    });
  } catch (error) {
    if (error instanceof MissingStatusProductsError) return 0;
    throw error;
  }
}

export async function getAdminProduct(id: string): Promise<AdminCatalogProduct | null> {
  return prisma.product.findUnique({ where: { id }, include: { variants: true } });
}

export type AdminProductUpdate = {
  readonly name: string;
  readonly brand: string;
  readonly price: number;
  readonly category: string;
  readonly description?: string | null;
  readonly descriptionKo?: string | null;
  readonly descriptionEn?: string | null;
  readonly originalPrice: number | null;
  readonly discountRate: number | null;
  readonly isActive: boolean;
  readonly variants?: readonly { readonly id: string; readonly isManuallySoldOut: boolean }[];
};

export async function updateAdminProduct(id: string, input: AdminProductUpdate): Promise<AdminCatalogProduct | null> {
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  const { variants, ...product } = input;
  return prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data: product });
    if (variants) {
      for (const variant of variants) {
        await tx.productVariant.updateMany({
          where: { id: variant.id, productId: id },
          data: { isManuallySoldOut: variant.isManuallySoldOut },
        });
      }
    }
    return tx.product.findUnique({ where: { id }, include: { variants: true } });
  });
}
