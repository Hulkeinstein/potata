import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminInventoryAdjustmentPanel } from "@/components/admin/AdminInventoryAdjustmentPanel";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const variant = {
  id: "variant-1",
  size: "M",
  color: "Black",
  stock: 8,
  isManuallySoldOut: false,
} as const;

describe("AdminInventoryAdjustmentPanel", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("loads adjustment history only after the operator opens it", async () => {
    // Given: an inventory option with an available history endpoint
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true, data: { items: [], nextCursor: null } }), { status: 200 }));

    // When: the adjustment card first renders
    render(<AdminInventoryAdjustmentPanel variant={variant} />);

    // Then: no history request is made until the operator asks for it
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "이력 보기" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/inventory-adjustments?variantId=variant-1");
    });
  });

  it("appends the next history page without duplicates", async () => {
    // Given: two cursor-based history pages with one overlapping row
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { items: [{ id: "adjustment-1", type: "RECEIVE", delta: 3, stockBefore: 5, stockAfter: 8, reason: "정기 입고", createdAt: "2026-08-26T09:30:00.000Z", actor: { name: "운영자" } }], nextCursor: "cursor-1" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { items: [{ id: "adjustment-1", type: "RECEIVE", delta: 3, stockBefore: 5, stockAfter: 8, reason: "정기 입고", createdAt: "2026-08-26T09:30:00.000Z", actor: { name: "운영자" } }, { id: "adjustment-2", type: "DISPOSAL", delta: -1, stockBefore: 5, stockAfter: 4, reason: "파손", createdAt: "2026-08-25T09:30:00.000Z", actor: { name: "운영자" } }], nextCursor: null } }), { status: 200 }));

    // When: the operator opens history and asks for the next page
    render(<AdminInventoryAdjustmentPanel variant={variant} />);
    fireEvent.click(screen.getByRole("button", { name: "이력 보기" }));
    await screen.findByText(/입고 \+3/);
    fireEvent.click(screen.getByRole("button", { name: "더 보기" }));

    // Then: the cursor is requested and only one copy of each adjustment remains
    await screen.findByText(/폐기 -1/);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/admin/inventory-adjustments?variantId=variant-1&cursor=cursor-1");
    expect(screen.getAllByText(/정기 입고/)).toHaveLength(1);
  });

  it("defaults disposal to a negative quantity and shows a safe server message", async () => {
    // Given: the adjustment endpoint rejects a disposal with a safe validation message
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false, error: "재고가 부족합니다." }), { status: 409 }));
    vi.stubGlobal("crypto", { randomUUID: () => "request-1" });
    render(<AdminInventoryAdjustmentPanel variant={variant} />);

    // When: the operator changes the type and submits a reason
    fireEvent.change(screen.getByLabelText("유형"), { target: { value: "DISPOSAL" } });
    fireEvent.change(screen.getByLabelText("variant-1 조정 사유"), { target: { value: "파손" } });

    // Then: disposal starts negative and the field-adjacent safe message is shown
    const quantityInput = screen.getByLabelText("variant-1 조정 수량");
    if (!(quantityInput instanceof HTMLInputElement)) throw new TypeError("조정 수량 입력칸이 아닙니다.");
    expect(quantityInput.value).toBe("-1");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "조정 기록" }));
    });
    expect(screen.getByRole("alert").textContent).toContain("재고가 부족합니다.");
  });
});
