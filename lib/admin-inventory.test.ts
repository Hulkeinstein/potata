import { describe, expect, it } from "vitest";
import { parseAdminInventoryQuery } from "@/lib/admin-inventory";

describe("admin inventory query", () => {
  it("uses a safe low-stock filter and positive page", () => {
    const parsed = parseAdminInventoryQuery(new URLSearchParams("filter=low-stock&page=2&q=Potata"));
    expect(parsed).toEqual({ filter: "low-stock", query: "Potata", page: 2, pageSize: 25 });
  });

  it("falls back to all for unsupported filters and pages", () => {
    const parsed = parseAdminInventoryQuery(new URLSearchParams("filter=hidden&page=0"));
    expect(parsed).toEqual({ filter: "all", query: "", page: 1, pageSize: 25 });
  });
});
