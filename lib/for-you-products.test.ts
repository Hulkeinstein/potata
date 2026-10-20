import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { product: { findMany } } }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));
import { getAllProducts } from "./products";
import { getForYouProducts } from "./for-you-products";

const row = (id: string, createdAt: string) => ({
  id, createdAt: new Date(createdAt), name: id, brand: "Brand", price: 10,
  imageUrl: "/image.jpg", images: [], category: "Top", sizes: [], colors: [], tags: [],
  sizeGuide: null, variants: [], rating: null, reviewCount: null,
});

beforeEach(() => vi.clearAllMocks());
describe("For You catalog read contract", () => {
  it("sorts raw rows by newest registration and descending id without changing Shop order", async () => {
    // Given: the cached active catalog retains its established ascending order.
    const rows = [row("old", "2025-01-01"), row("a", "2026-01-01"), row("z", "2026-01-01")];
    findMany.mockImplementation(({ select }: { select?: unknown }) => Promise.resolve(select ? [] : rows));
    // When: each consumer reads its own contract.
    const [feed, shop] = await Promise.all([getForYouProducts(), getAllProducts()]);
    // Then: only For You reverses chronology, with a stable tie break.
    expect(feed.map(({ id }) => id)).toEqual(["z", "a", "old"]);
    expect(shop.map(({ id }) => id)).toEqual(["old", "a", "z"]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true } }));
  });
  it("includes a newly registered active product on the next uncached read", async () => {
    // Given: the refreshed cache now includes a new product.
    const rows = [row("old", "2025-01-01"), row("new", "2026-02-01")];
    findMany.mockImplementation(({ select }: { select?: unknown }) => Promise.resolve(select ? [] : rows));
    // When / Then: it appears first, retaining the shared inventory mapping.
    expect(await getForYouProducts()).toMatchObject([{ id: "new", inventoryStatus: "SOLD_OUT" }, { id: "old" }]);
  });
});
