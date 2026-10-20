import { describe, expect, it } from "vitest";
import { parseProductStatusBatch } from "./admin-product-status-input";

describe("bulk product status boundary", () => {
  it("accepts one through fifty exact identifiers", () => {
    for (const size of [1, 50]) {
      const ids = Array.from({ length: size }, (_, index) => `p${index}`);
      expect(parseProductStatusBatch({ ids, isActive: false })).toEqual({ ids, isActive: false });
    }
  });
  it.each([null, {}, { ids: [], isActive: true }, { ids: ["x", "x"], isActive: true }, { ids: [" x"], isActive: true }, { ids: [""], isActive: true }, { ids: [1], isActive: true }, { ids: ["x"], isActive: "true" }, { ids: ["x"], isActive: false, stock: 0 }, { ids: ["x".repeat(201)], isActive: true }, { ids: Array.from({ length: 51 }, (_, i) => `p${i}`), isActive: true }])("rejects invalid input %j", (input) => {
    expect(parseProductStatusBatch(input)).toBeNull();
  });
});
