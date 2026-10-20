import { describe, expect, it } from "vitest";
import { safeCatalogReturnTo } from "./admin-catalog-query";

describe("safe catalog return", () => {
  it.each(["https://evil.test/admin/products", "//evil.test/admin/products", "/admin/products/new", "javascript:alert(1)"])("rejects external or non-list destination %s", (value) => {
    expect(safeCatalogReturnTo(value)).toBe("/admin/products");
  });
  it("preserves only normalized list conditions", () => {
    expect(safeCatalogReturnTo("/admin/products?q=Seoul&brand=Brand&page=2&status=inactive&sort=name&returnTo=https://evil.test")).toBe("/admin/products?q=Seoul&brand=Brand&status=inactive&sort=name&page=2");
  });
});
