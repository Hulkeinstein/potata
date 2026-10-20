import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), admin: vi.fn(), update: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/admin", () => ({ isAdmin: mocks.admin }));
vi.mock("@/lib/admin-product-catalog", () => ({ updateAdminProductStatus: mocks.update }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.invalidate }));
import { PATCH } from "./route";
const context = { params: Promise.resolve({ id: "product" }) };
function request(body: unknown) { return new NextRequest("http://localhost/api/admin/catalog/product/status", { method: "PATCH", body: JSON.stringify(body) }); }
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ user: { id: "admin", email: "a@a.test" } }); mocks.admin.mockReturnValue(true); mocks.update.mockResolvedValue(true); });
describe("narrow product status mutation", () => {
  it("updates only isActive", async () => {
    const response = await PATCH(request({ isActive: false }), context);
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith("product", false);
    expect(mocks.invalidate).toHaveBeenCalledWith("products", { expire: 0 });
  });
  it("rejects stale full product payload", async () => {
    expect((await PATCH(request({ isActive: false, price: 100 }), context)).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each([null, { user: { id: "user", email: "user@test" } }])("blocks unauthorized caller", async (session) => {
    mocks.auth.mockResolvedValue(session); mocks.admin.mockReturnValue(false);
    expect((await PATCH(request({ isActive: true }), context)).status).toBe(session ? 403 : 401);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("does not invalidate a deleted product", async () => {
    mocks.update.mockResolvedValue(false);
    expect((await PATCH(request({ isActive: false }), context)).status).toBe(404);
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
});
