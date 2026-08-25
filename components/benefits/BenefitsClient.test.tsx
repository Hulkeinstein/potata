import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BenefitsClient } from "./BenefitsClient";

describe("BenefitsClient", () => {
  it("빈 상태와 checkout 미연동 경계를 표시한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { coupons: [], points: { balance: 0, entries: [], nextCursor: null } } }) }));
    render(<BenefitsClient />);
    expect(await screen.findByText("발급된 쿠폰이 없습니다.")).toBeTruthy();
    expect(screen.getByText(/checkout에서 사용할 수 없습니다/)).toBeTruthy();
  });

  it("쿠폰 범위·상태와 append-only 포인트 내역을 표시한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { coupons: [{ id: "g1", name: "Pilot", ratePercent: 15, minOrderAed: 100, maxDiscountAed: 50, scope: "BRANDS", brands: ["Potata"], status: "ACTIVE", expiresAt: null }], points: { balance: 70, entries: [{ id: "p1", type: "ADMIN_GRANT", amount: 100, label: "관리자 포인트 지급", createdAt: "2026-08-24T00:00:00Z" }, { id: "p2", type: "ADMIN_REVERSAL", amount: -30, label: "포인트 지급 취소", createdAt: "2026-08-24T01:00:00Z" }], nextCursor: null } } }) }));
    render(<BenefitsClient />);
    expect(await screen.findByText("15% · 최소 주문 100 AED · 최대 50 AED")).toBeTruthy();
    expect(screen.getByText("Potata 상품")).toBeTruthy();
    expect(screen.getByText("70 P")).toBeTruthy();
  });
});
