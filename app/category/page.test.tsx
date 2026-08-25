import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CategoryPage from "./page";

vi.mock("next/image", () => ({ default: ({ alt }: { readonly alt: string }) => <span role="img" aria-label={alt} /> }));
vi.mock("next/link", () => ({ default: ({ children, href }: { readonly children: React.ReactNode; readonly href: string }) => <a href={href}>{children}</a> }));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { readonly children: React.ReactNode }) => <>{children}</>,
  motion: { div: ({ children }: { readonly children: React.ReactNode }) => <div>{children}</div> },
}));

describe("Category navigation", () => {
  it("하위 카드는 비상호작용으로 두고 선택된 부모 category만 Shop에 연결한다", () => {
    render(<CategoryPage />);
    expect(screen.queryByRole("link", { name: /Jackets/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Shop Outer" }).getAttribute("href")).toBe("/shop?category=Outer");

    fireEvent.click(screen.getAllByRole("button", { name: "Top" })[0]);
    expect(screen.queryByRole("link", { name: /T-Shirts/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Shop Top" }).getAttribute("href")).toBe("/shop?category=Top");
  });
});
