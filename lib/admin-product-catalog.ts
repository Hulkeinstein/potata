import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type AdminCatalogProduct = Prisma.ProductGetPayload<{ include: { variants: true } }>;

export type AdminCatalogQuery = {
  readonly query: string;
  readonly page: number;
  readonly pageSize: number;
};

export type AdminCatalogPage = {
  readonly items: readonly AdminCatalogProduct[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
};

const MAX_PAGE_SIZE = 50;

export function parseAdminCatalogQuery(searchParams: URLSearchParams): AdminCatalogQuery {
  const query = (searchParams.get("q") ?? "").trim().slice(0, 100);
  const parsedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const parsedPageSize = Number.parseInt(searchParams.get("pageSize") ?? "20", 10);
  return {
    query,
    page: Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    pageSize: Number.isSafeInteger(parsedPageSize) && parsedPageSize > 0
      ? Math.min(parsedPageSize, MAX_PAGE_SIZE)
      : 20,
  };
}

export async function listAdminProducts(input: AdminCatalogQuery): Promise<AdminCatalogPage> {
  const where = input.query
    ? { OR: [{ name: { contains: input.query, mode: "insensitive" as const } }, { brand: { contains: input.query, mode: "insensitive" as const } }] }
    : {};
  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({ where, include: { variants: true }, orderBy: { createdAt: "desc" }, skip: (input.page - 1) * input.pageSize, take: input.pageSize }),
    prisma.product.count({ where }),
  ]);
  return { items, total, page: input.page, pageSize: input.pageSize };
}

export async function getAdminProduct(id: string): Promise<AdminCatalogProduct | null> {
  return prisma.product.findUnique({ where: { id }, include: { variants: true } });
}

export type AdminProductUpdate = {
  readonly name: string;
  readonly brand: string;
  readonly price: number;
  readonly category: string;
  readonly description: string | null;
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
