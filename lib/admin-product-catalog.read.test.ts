import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findMany: vi.fn(), count: vi.fn(), transaction: vi.fn(), updateMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { product: mocks, $transaction: mocks.transaction } }));
import { listAdminProducts, updateAdminProductStatus } from "./admin-product-catalog";
import { parseAdminCatalogQuery } from "./admin-catalog-query";
beforeEach(() => { vi.clearAllMocks(); mocks.transaction.mockResolvedValue([[], 0]); mocks.updateMany.mockResolvedValue({ count: 1 }); });
describe("catalog database contracts", () => {
  it.each(["active", "sold-out", "inactive"])("uses identical %s conditions for list and count", async (status) => {
    await listAdminProducts(parseAdminCatalogQuery(new URLSearchParams(`brand=Seoul&category=Top&status=${status}&sort=price-asc`)));
    const query = mocks.findMany.mock.calls[0]?.[0];
    expect(query.where).toMatchObject({ brand: "Seoul", category: "Top", isActive: status !== "inactive" });
    expect(mocks.count).toHaveBeenCalledWith({ where: query.where });
    expect(query.orderBy).toEqual([{ price: "asc" }, { id: "asc" }]);
    if (status === "active") expect(query.where.variants).toEqual({ some: { stock: { gt: 0 }, isManuallySoldOut: false } });
    if (status === "sold-out") expect(query.where.variants).toEqual({ none: { stock: { gt: 0 }, isManuallySoldOut: false } });
  });
  it("never overwrites product content or stock during a visibility change", async () => {
    expect(await updateAdminProductStatus("product", false)).toBe(true);
    expect(mocks.updateMany).toHaveBeenCalledExactlyOnceWith({ where: { id: "product" }, data: { isActive: false } });
  });
});
