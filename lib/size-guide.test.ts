import { describe, expect, it } from "vitest";
import { parseSizeGuide } from "./size-guide";

describe("parseSizeGuide", () => {
  it("실제 치수 표를 파싱한다 when 열과 행이 일치한다", () => {
    const result = parseSizeGuide({ version: 1, measurementType: "garment", unit: "cm", columns: [{ key: "chest", label: "가슴" }], rows: [{ size: "M", measurements: { chest: 55 } }] }, ["M"]);
    expect(result).toEqual({ version: 1, measurementType: "garment", unit: "cm", columns: [{ key: "chest", label: "가슴" }], rows: [{ size: "M", measurements: { chest: 55 } }] });
  });

  it("불완전한 치수 표를 거부한다 when 측정값이 빠졌다", () => {
    expect(parseSizeGuide({ version: 1, measurementType: "garment", unit: "cm", columns: [{ key: "chest", label: "가슴" }], rows: [{ size: "M", measurements: {} }] })).toBeNull();
  });

  it("상품 옵션과 행이 다르거나 알 수 없는 측정키가 있으면 거부한다", () => {
    const guide = { version: 1, measurementType: "garment", unit: "cm", columns: [{ key: "chest", label: "가슴" }], rows: [{ size: "M", measurements: { chest: 55, extra: 1 } }] };
    expect(parseSizeGuide(guide, ["S", "M"])).toBeNull();
  });
});
