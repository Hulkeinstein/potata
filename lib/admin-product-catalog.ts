import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { AdminCatalogQuery } from "./admin-catalog-query";
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
  const where: Prisma.ProductWhereInput = {
    ...(input.query ? { OR: [{ name: { contains: input.query, mode: "insensitive" } }, { brand: { contains: input.query, mode: "insensitive" } }] } : {}),
    ...(input.brand ? { brand: input.brand } : {}),
    ...(input.category ? { category: input.category } : {}),
    ...(input.status === "active" ? { isActive: true, variants: { some: available } } : {}),
    ...(input.status === "sold-out" ? { isActive: true, variants: { none: available } } : {}),
    ...(input.status === "inactive" ? { isActive: false } : {}),
  };
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
  const result = await prisma.product.updateMany({ where: { id }, data: { isActive } });
  return result.count === 1;
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
