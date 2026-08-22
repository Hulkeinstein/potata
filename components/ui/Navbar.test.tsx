import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "./Navbar";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { name: "Mirim" } }, status: "authenticated" }),
  signOut: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/store/cart-store", () => ({ useCartStore: () => ({ toggleCart: vi.fn(), items: [] }) }));
vi.mock("@/components/search/SearchOverlay", () => ({ SearchOverlay: () => null }));
vi.mock("@/components/cart/CartDrawer", () => ({ CartDrawer: () => null }));

describe("Navbar notification badge", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("읽지 않은 알림 수를 접근 가능한 알림 링크에 표시한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { items: [], nextCursor: null, unreadCount: 3 } }), { status: 200 }),
    );

    render(<Navbar />);

    const link = await screen.findByRole("link", { name: "알림, 읽지 않은 알림 3개" });
    expect(link.getAttribute("href")).toBe("/notifications");
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("전체 읽음 이벤트를 받으면 배지를 숨긴다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { items: [], nextCursor: null, unreadCount: 1 } }), { status: 200 }),
    );

    render(<Navbar />);
    expect(await screen.findByText("1")).toBeTruthy();

    act(() => window.dispatchEvent(new Event("potata:notifications-read")));

    await waitFor(() => expect(screen.queryByText("1")).toBeNull());
    expect(screen.getByRole("link", { name: "알림" })).toBeTruthy();
  });

  it("읽지 않은 알림이 0개이면 배지를 표시하지 않는다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { items: [], nextCursor: null, unreadCount: 0 } }), { status: 200 }),
    );

    render(<Navbar />);

    expect(await screen.findByRole("link", { name: "알림" })).toBeTruthy();
    expect(screen.queryByText("0")).toBeNull();
  });
});
