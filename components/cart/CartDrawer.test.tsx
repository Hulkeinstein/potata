import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CartDrawer } from "./CartDrawer";

const closeCart = vi.hoisted(() => vi.fn());

vi.mock("@/store/cart-store", () => ({
  useCartStore: () => ({
    items: [],
    isOpen: true,
    closeCart,
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    totalItems: () => 0,
  }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ children, href, onClick }: { readonly children: React.ReactNode; readonly href: string; readonly onClick?: () => void }) => (
    <a href={href} onClick={onClick}>{children}</a>
  ),
}));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { readonly children: React.ReactNode }) => <>{children}</>,
  motion: { div: ({ children }: { readonly children: React.ReactNode }) => <div>{children}</div> },
}));

describe("CartDrawer empty state", () => {
  it("Start Shopping이 drawer를 닫고 실제 Shop route로 이동한다", () => {
    render(<CartDrawer />);
    const link = screen.getByRole("link", { name: "Start Shopping" });
    expect(link.getAttribute("href")).toBe("/shop");
    fireEvent.click(link);
    expect(closeCart).toHaveBeenCalledTimes(1);
  });
});
