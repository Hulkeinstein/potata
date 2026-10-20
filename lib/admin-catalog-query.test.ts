import { describe, expect, it } from "vitest";
import { catalogQueryParams, parseAdminCatalogQuery, safeCatalogReturnTo } from "./admin-catalog-query";

describe("safe catalog return", () => {
  it("keeps the content quality filter across parsing, pagination and editing", () => {
    const query = parseAdminCatalogQuery(new URLSearchParams("quality=missing-ko&status=inactive&page=2"));
    expect(query).toMatchObject({ quality: "missing-ko", status: "inactive", page: 2 });
    expect(catalogQueryParams(query).get("quality")).toBe("missing-ko");
    expect(safeCatalogReturnTo("/admin/products?quality=missing-image&sort=name&page=2")).toBe("/admin/products?quality=missing-image&sort=name&page=2");
  });
  it("normalizes unsupported quality inputs to all", () => {
    expect(parseAdminCatalogQuery(new URLSearchParams("quality=unknown"))).toMatchObject({ quality: "all" });
  });
  it.each(["https://evil.test/admin/products", "//evil.test/admin/products", "/admin/products/new", "javascript:alert(1)"])("rejects external or non-list destination %s", (value) => {
    expect(safeCatalogReturnTo(value)).toBe("/admin/products");
  });
  it("preserves only normalized list conditions", () => {
    expect(safeCatalogReturnTo("/admin/products?q=Seoul&brand=Brand&page=2&status=inactive&sort=name&returnTo=https://evil.test")).toBe("/admin/products?q=Seoul&brand=Brand&status=inactive&sort=name&page=2");
  });
});
