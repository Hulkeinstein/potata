import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ updateMany: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
import { updateAdminProductStatuses, updateAdminProductStatus } from "./admin-product-catalog";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.updateMany.mockResolvedValue({ count: 2 });
  mocks.transaction.mockImplementation(async (run) => run({ product: { updateMany: mocks.updateMany } }));
});
describe("shared narrow status writer", () => {
  it("writes only visibility for all specified products", async () => {
    expect(await updateAdminProductStatuses(["a", "b"], false)).toBe(2);
    expect(mocks.updateMany).toHaveBeenCalledExactlyOnceWith({ where: { id: { in: ["a", "b"] } }, data: { isActive: false } });
  });
  it("throws inside the transaction and returns zero when any product is missing", async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });
    expect(await updateAdminProductStatuses(["a", "missing"], true)).toBe(0);
    await expect(mocks.transaction.mock.results[0]?.value).rejects.toBeInstanceOf(Error);
  });
  it("keeps the single-product boolean contract through the shared writer", async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });
    expect(await updateAdminProductStatus("a", false)).toBe(true);
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { id: { in: ["a"] } }, data: { isActive: false } });
  });
  it("does not swallow unexpected database failure", async () => {
    mocks.updateMany.mockRejectedValue(new Error("db"));
    await expect(updateAdminProductStatuses(["a"], true)).rejects.toThrow("db");
  });
});
