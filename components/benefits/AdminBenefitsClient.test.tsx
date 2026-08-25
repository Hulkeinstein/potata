import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminBenefitsClient } from "./AdminBenefitsClient";

describe("AdminBenefitsClient", () => {
  it("관리 화면에 checkout 경계와 서버 대상 미리보기를 표시한다", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<AdminBenefitsClient initialData={{ campaigns: [], policies: [], brands: ["Potata"] }} />);
    expect(screen.getByText(/checkout·주문 금액·결제에는 연결되지 않습니다/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "대상 스냅샷 미리보기" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "대상 확인 필요" }).hasAttribute("disabled")).toBe(true);
  });

  it("쿠폰 회수는 명시적 확인 대화상자에서 취소할 수 있다", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminBenefitsClient initialData={{ campaigns: [{ id: "campaign-1", name: "Pilot", ratePercent: 10, minOrderAed: 100, maxDiscountAed: 20, scope: "ALL_PRODUCTS", brands: [], active: true, _count: { grants: 1 }, grants: [{ id: "grant-1", revokedAt: null }] }], policies: [], brands: [] }} />);

    fireEvent.click(screen.getByRole("button", { name: "회수" }));
    expect(screen.getByRole("dialog", { name: "쿠폰 회수 확인" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.queryByRole("dialog", { name: "쿠폰 회수 확인" })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
