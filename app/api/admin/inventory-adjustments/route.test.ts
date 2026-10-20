import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), admin: vi.fn(), adjust: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/admin", () => ({ isAdmin: mocks.admin }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.invalidate }));
vi.mock("@/lib/inventory-adjustment-service", () => ({
  adjustInventory: mocks.adjust, listVariantInventoryAdjustments: vi.fn(),
  InventoryAdjustmentError: class extends Error {},
}));
import { POST } from "./route";

const input = { variantId: "variant", type: "RECEIVE", delta: 1, reason: "Restock", idempotencyKey: "request" };
const request = (body: unknown) => new NextRequest("http://localhost/api/admin/inventory-adjustments", {
  method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "admin", email: "admin@example.test" } });
  mocks.admin.mockReturnValue(true);
  mocks.adjust.mockResolvedValue({ id: "adjustment" });
});
describe("inventory catalog invalidation", () => {
  it("expires product data only after a successful adjustment", async () => {
    // Given: an authorized adjustment that commits successfully.
    // When:
    const response = await POST(request(input));
    // Then:
    expect(response.status).toBe(200);
    expect(mocks.invalidate).toHaveBeenCalledExactlyOnceWith("products", { expire: 0 });
    expect(mocks.adjust.mock.invocationCallOrder[0]).toBeLessThan(mocks.invalidate.mock.invocationCallOrder[0]);
  });
  it.each(["unauthorized", "invalid", "failed"])("does not invalidate when %s", async (failure) => {
    // Given:
    if (failure === "unauthorized") mocks.admin.mockReturnValue(false);
    if (failure === "failed") mocks.adjust.mockRejectedValue(new Error("failed"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    // When:
    await POST(request(failure === "invalid" ? {} : input));
    // Then:
    expect(mocks.invalidate).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
