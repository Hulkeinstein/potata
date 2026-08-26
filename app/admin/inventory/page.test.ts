import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("admin inventory page", () => {
  it("does not pass a function prop across the server-client boundary", async () => {
    // Given: the server-rendered inventory page source
    const source = await readFile("app/admin/inventory/page.tsx", "utf8");

    // When: the page renders an interactive inventory adjustment panel

    // Then: it passes serializable data only
    expect(source).not.toContain("onAdjusted={() => undefined}");
  });

  it("uses the admin layout navigation exactly once", async () => {
    // Given: the protected admin layout already renders AdminNav
    const source = await readFile("app/admin/inventory/page.tsx", "utf8");

    // When: the inventory page is nested in that layout

    // Then: it does not render a second navigation bar
    expect(source).not.toContain("<AdminNav />");
  });

  it("renders each inventory option with its product thumbnail", async () => {
    // Given: the operator needs a visual product identifier
    const source = await readFile("app/admin/inventory/page.tsx", "utf8");

    // When: an inventory option is listed

    // Then: the product image is rendered alongside the item details
    expect(source).toContain("variant.product.imageUrl");
  });
});
