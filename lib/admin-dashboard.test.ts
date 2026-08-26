import { describe, expect, it } from "vitest";
import { summarizeAdminDashboard } from "@/lib/admin-dashboard";

describe("admin dashboard summary", () => {
  it("counts active sale states without including inactive inventory in alerts", () => {
    const summary = summarizeAdminDashboard([
      { isActive: true, variants: [{ stock: 5, isManuallySoldOut: false }, { stock: 2, isManuallySoldOut: false }] },
      { isActive: true, variants: [{ stock: 0, isManuallySoldOut: false }] },
      { isActive: true, variants: [{ stock: 5, isManuallySoldOut: true }] },
      { isActive: false, variants: [{ stock: 1, isManuallySoldOut: false }] },
    ]);
    expect(summary).toEqual({ totalProducts: 4, activeProducts: 3, inactiveProducts: 1, productsWithAvailableVariant: 1, soldOutProducts: 2, manuallySoldOutVariants: 1, zeroStockVariants: 1, lowStockVariants: 1 });
  });
});
