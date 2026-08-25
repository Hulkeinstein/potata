import { describe, expect, it } from "vitest";
import { couponGrantStatus, sumPointBalance } from "./status";

describe("benefit status", () => {
  it("쿠폰 상태를 ACTIVE, EXPIRED, REVOKED 순으로 결정한다", () => {
    const now = new Date("2026-08-24T00:00:00Z");
    expect(couponGrantStatus({ revokedAt: null, expiresAt: null }, now)).toBe("ACTIVE");
    expect(couponGrantStatus({ revokedAt: null, expiresAt: new Date("2026-08-23T23:59:59Z") }, now)).toBe("EXPIRED");
    expect(couponGrantStatus({ revokedAt: now, expiresAt: new Date("2026-08-23T23:59:59Z") }, now)).toBe("REVOKED");
  });

  it("포인트 잔액을 append-only 원장에서 합산한다", () => {
    expect(sumPointBalance([{ amount: 100 }, { amount: -30 }])).toBe(70);
  });
});
