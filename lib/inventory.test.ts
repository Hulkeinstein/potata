import { describe, expect, it } from "vitest";
import { getInventoryStatus, getProductInventoryStatus } from "@/lib/inventory";

describe("inventory status", () => {
  it("marks a variant manually sold out even when stock remains", () => {
    expect(getInventoryStatus({ stock: 7, isManuallySoldOut: true })).toBe("MANUAL_SOLD_OUT");
  });

  it("marks zero stock as sold out", () => {
    expect(getInventoryStatus({ stock: 0, isManuallySoldOut: false })).toBe("SOLD_OUT");
  });

  it("marks a product sold out when none of its variants is purchasable", () => {
    expect(getProductInventoryStatus([
      { stock: 0, isManuallySoldOut: false },
      { stock: 3, isManuallySoldOut: true },
    ])).toBe("SOLD_OUT");
  });

  it("keeps a product on sale when one variant remains purchasable", () => {
    expect(getProductInventoryStatus([
      { stock: 0, isManuallySoldOut: false },
      { stock: 3, isManuallySoldOut: false },
    ])).toBe("ON_SALE");
  });
});
