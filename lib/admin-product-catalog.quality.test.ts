import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findMany: vi.fn(), count: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { product: mocks, $transaction: mocks.transaction } }));
import { listAdminProducts } from "./admin-product-catalog";
import { parseAdminCatalogQuery } from "./admin-catalog-query";

beforeEach(() => { vi.resetAllMocks(); mocks.transaction.mockResolvedValue([[], 0]); });
describe("catalog quality database filtering", () => {
  it("matches whitespace facts before paging and reuses identical list/count conditions", async () => {
    // Given: the base query has already selected the requested brand and inactive state.
    mocks.findMany.mockResolvedValueOnce([
      { id: "blank", descriptionKo: " \n", descriptionEn: "English", imageUrl: "/a.png" },
      { id: "healthy", descriptionKo: "한글", descriptionEn: "English", imageUrl: "/a.png" },
      { id: "null", descriptionKo: null, descriptionEn: "English", imageUrl: "/a.png" },
    ]);
    // When:
    await listAdminProducts(parseAdminCatalogQuery(new URLSearchParams("brand=QA&status=inactive&quality=missing-ko&pageSize=1&page=2")));
    // Then: all candidates are classified before the final page is selected.
    expect(mocks.findMany.mock.calls[0]?.[0]).toEqual({ where: { brand: "QA", isActive: false }, select: { id: true, descriptionKo: true, descriptionEn: true, imageUrl: true } });
    const finalQuery = mocks.findMany.mock.calls[1]?.[0];
    expect(finalQuery).toMatchObject({ where: { AND: [{ brand: "QA", isActive: false }, { id: { in: ["blank", "null"] } }] }, take: 1, skip: 1 });
    expect(mocks.count).toHaveBeenCalledWith({ where: finalQuery.where });
  });
  it("does not add a candidate scan for the default all view", async () => {
    await listAdminProducts(parseAdminCatalogQuery(new URLSearchParams()));
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.findMany.mock.calls[0]?.[0]).not.toHaveProperty("select");
  });
  it("uses an empty id condition rather than accidentally returning all products", async () => {
    mocks.findMany.mockResolvedValueOnce([]);
    await listAdminProducts(parseAdminCatalogQuery(new URLSearchParams("quality=missing-image")));
    expect(mocks.findMany.mock.calls[1]?.[0].where).toEqual({ AND: [{}, { id: { in: [] } }] });
  });
});
