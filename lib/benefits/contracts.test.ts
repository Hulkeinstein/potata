import { describe, expect, it } from "vitest";
import { parseCampaignInput, parsePointPolicyInput, parseManualPointInput } from "./contracts";

describe("benefits contracts", () => {
  it("캠페인을 파싱한다 when 브랜드 범위와 AED 상한이 유효하다", () => {
    const result = parseCampaignInput({ name: "Brand pilot", ratePercent: 15, minOrderAed: 100, maxDiscountAed: 50, scope: "BRANDS", brands: ["Potata"], reason: "Pilot" }, ["Potata"]);
    expect(result.ok).toBe(true);
  });

  it("캠페인을 거부한다 when 할인율·상한·브랜드 범위가 유효하지 않다", () => {
    expect(parseCampaignInput({ name: "Bad", ratePercent: 0, minOrderAed: 0, maxDiscountAed: 0, scope: "BRANDS", brands: [], reason: "x" }, ["Potata"]).ok).toBe(false);
    expect(parseCampaignInput({ name: "Bad", ratePercent: 101, minOrderAed: 100, maxDiscountAed: 10, scope: "BRANDS", brands: ["Unknown"], reason: "x" }, ["Potata"]).ok).toBe(false);
  });

  it("구매 포인트 정책은 PURCHASE_CONFIRMED만 허용하고 포인트를 생성하지 않는다", () => {
    const result = parsePointPolicyInput({ rateBasisPoints: 300, perOrderCap: 100, scope: "ALL_PRODUCTS", brands: [], activationEvent: "PURCHASE_CONFIRMED", reason: "Future policy" }, ["Potata"]);
    expect(result.ok).toBe(true);
    expect(parsePointPolicyInput({ rateBasisPoints: 0, perOrderCap: 0, scope: "ALL_PRODUCTS", brands: [], activationEvent: "PENDING", reason: "Bad" }, ["Potata"]).ok).toBe(false);
  });

  it("수동 포인트는 양수와 감사 사유·멱등 키를 요구한다", () => {
    expect(parseManualPointInput({ email: "USER@EXAMPLE.COM", amount: 100, reason: "CS grant", idempotencyKey: "grant-1" }).ok).toBe(true);
    expect(parseManualPointInput({ email: "user@example.com", amount: -1, reason: "", idempotencyKey: "" }).ok).toBe(false);
  });
});
