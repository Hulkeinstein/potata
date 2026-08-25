import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("benefits pilot isolation", () => {
  it("checkout·order·cart에 쿠폰과 포인트 계산을 연결하지 않는다", () => {
    const sources = ["app/checkout/page.tsx", "app/api/orders/route.ts", "app/api/cart/route.ts"].map((path) => readFileSync(path, "utf8")).join("\n").toLowerCase();
    expect(sources).not.toContain("couponcampaign");
    expect(sources).not.toContain("pointledger");
    expect(sources).not.toContain("/api/users/me/benefits");
  });

  it("Order 모델은 기존 PENDING 주문 계약만 유지한다", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const start = schema.indexOf("model Order {");
    const end = schema.indexOf("\n}\n", start);
    const orderModel = schema.slice(start, end);
    expect(orderModel).toContain("status         OrderStatus @default(PENDING)");
    expect(orderModel).not.toMatch(/coupon|point|payment/i);
  });
});
