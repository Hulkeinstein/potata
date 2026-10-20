import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), admin: vi.fn(), list: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/admin", () => ({ isAdmin: mocks.admin }));
vi.mock("@/lib/admin-product-catalog", async (original) => ({ ...await original<typeof import("@/lib/admin-product-catalog")>(), listAdminProducts: mocks.list }));
import { GET } from "./route";
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ user: { id: "admin", email: "a@test" } }); mocks.admin.mockReturnValue(true); });
describe("catalog list endpoint", () => {
  it("passes all normalized conditions to the existing loader", async () => {
    mocks.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    const response = await GET(new NextRequest("http://localhost/api/admin/catalog?brand=Seoul&category=Top&quality=missing-image&status=active&sort=name"));
    expect(response.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith({ query: "", brand: "Seoul", category: "Top", quality: "missing-image", status: "active", sort: "name", page: 1, pageSize: 20 });
  });
  it("returns a generic failure without exposing database internals", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.list.mockRejectedValue(new Error("secret database URL"));
    const response = await GET(new NextRequest("http://localhost/api/admin/catalog"));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret database URL");
    spy.mockRestore();
  });
  it.each([null, { user: { id: "user", email: "u@test" } }])("blocks unauthorized list reads", async (session) => {
    mocks.auth.mockResolvedValue(session); mocks.admin.mockReturnValue(false);
    expect((await GET(new NextRequest("http://localhost/api/admin/catalog"))).status).toBe(session ? 403 : 401);
    expect(mocks.list).not.toHaveBeenCalled();
  });
});
