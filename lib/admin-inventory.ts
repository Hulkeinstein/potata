import { prisma } from "@/lib/prisma";

export const INVENTORY_FILTERS = ["all", "low-stock", "sold-out", "manual-sold-out"] as const;
export type InventoryFilter = (typeof INVENTORY_FILTERS)[number];

export type AdminInventoryQuery = { readonly filter: InventoryFilter; readonly query: string; readonly page: number; readonly pageSize: number };

const PAGE_SIZE = 25;

export function parseAdminInventoryQuery(searchParams: URLSearchParams): AdminInventoryQuery {
  const candidate = searchParams.get("filter");
  const filter = INVENTORY_FILTERS.find((value) => value === candidate) ?? "all";
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  return { filter, query: (searchParams.get("q") ?? "").trim().slice(0, 100), page: Number.isSafeInteger(page) && page > 0 ? page : 1, pageSize: PAGE_SIZE };
}

export async function listAdminInventory(input: AdminInventoryQuery) {
  const variants = await prisma.productVariant.findMany({ where: { product: { isActive: true, ...(input.query ? { OR: [{ name: { contains: input.query, mode: "insensitive" } }, { brand: { contains: input.query, mode: "insensitive" } }] } : {}) } }, include: { product: { select: { id: true, name: true, brand: true, imageUrl: true } } }, orderBy: [{ stock: "asc" }, { updatedAt: "desc" }] });
  const filtered = variants.filter((variant) => input.filter === "all" || input.filter === "low-stock" && variant.stock >= 1 && variant.stock <= 3 || input.filter === "sold-out" && variant.stock === 0 && !variant.isManuallySoldOut || input.filter === "manual-sold-out" && variant.isManuallySoldOut);
  const start = (input.page - 1) * input.pageSize;
  return { items: filtered.slice(start, start + input.pageSize), total: filtered.length, page: input.page, pageSize: input.pageSize };
}
