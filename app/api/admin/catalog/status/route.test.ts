import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), admin: vi.fn(), update: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/admin", () => ({ isAdmin: mocks.admin }));
vi.mock("@/lib/admin-product-catalog", () => ({ updateAdminProductStatuses: mocks.update }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.invalidate }));
import { PATCH } from "./route";
function request(body: unknown) { return new NextRequest("http://localhost/api/admin/catalog/status", { method: "PATCH", body: JSON.stringify(body) }); }
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ user: { id: "admin", email: "a@test" } }); mocks.admin.mockReturnValue(true); mocks.update.mockResolvedValue(2); });
describe("bulk product status route", () => {
  it("processes an explicit target once and expires catalog data", async () => {
    const response = await PATCH(request({ ids: ["a", "b"], isActive: false }));
    expect(await response.json()).toEqual({ success: true, processed: 2 });
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith(["a", "b"], false);
    expect(mocks.invalidate).toHaveBeenCalledExactlyOnceWith("products", { expire: 0 });
  });
  it.each([null, { user: { id: "user", email: "user@test" } }])("blocks unauthorized calls before writing", async (session) => {
    mocks.auth.mockResolvedValue(session); mocks.admin.mockReturnValue(false);
    expect((await PATCH(request({ ids: ["a"], isActive: false }))).status).toBe(session ? 403 : 401);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects stale full-product input", async () => {
    expect((await PATCH(request({ ids: ["a"], isActive: false, stock: 0 }))).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("returns not found without invalidation after atomic rollback", async () => {
    mocks.update.mockResolvedValue(0);
    expect((await PATCH(request({ ids: ["a", "missing"], isActive: true }))).status).toBe(404);
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it("does not expose internal database errors", async () => {
    mocks.update.mockRejectedValue(new Error("secret connection"));
    const response = await PATCH(request({ ids: ["a"], isActive: true }));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret");
  });
  it("reports applied status honestly if cache invalidation fails after commit", async () => {
    mocks.invalidate.mockImplementation(() => { throw new Error("cache"); });
    const response = await PATCH(request({ ids: ["a", "b"], isActive: true }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, processed: 2, warning: expect.any(String) });
  });
  it("rejects malformed and oversized requests", async () => {
    expect((await PATCH(new NextRequest("http://localhost/api/admin/catalog/status", { method: "PATCH", body: "{" }))).status).toBe(400);
    expect((await PATCH(new NextRequest("http://localhost/api/admin/catalog/status", { method: "PATCH", body: " ".repeat(102401) }))).status).toBe(413);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
