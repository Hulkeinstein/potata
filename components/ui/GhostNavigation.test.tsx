import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Footer } from "./Footer";
import { Hero } from "./Hero";
import { ProductGrid } from "./ProductGrid";

vi.mock("next/image", () => ({ default: ({ alt }: { readonly alt: string }) => <span role="img" aria-label={alt} /> }));
vi.mock("next/link", () => ({ default: ({ children, href }: { readonly children: React.ReactNode; readonly href: string }) => <a href={href}>{children}</a> }));
vi.mock("framer-motion", () => ({ motion: {
  div: ({ children }: { readonly children: React.ReactNode }) => <div>{children}</div>,
  p: ({ children }: { readonly children: React.ReactNode }) => <p>{children}</p>,
} }));
const sessionState = vi.hoisted(() => ({ authenticated: false }));
vi.mock("next-auth/react", () => ({ useSession: () => sessionState.authenticated
  ? { status: "authenticated", data: { user: { name: "Mira" } } }
  : { status: "unauthenticated", data: null } }));
vi.mock("./AICoordinatorPopup", () => ({ AICoordinatorPopup: ({ name }: { readonly name?: string }) => <div>AI COORDINATOR {name}</div> }));
vi.mock("./ProductCard", () => ({ ProductCard: ({ product }: { readonly product: { readonly id: string; readonly name: string } }) => <a href={`/product/${product.id}`}>{product.name}</a> }));

describe("ghost navigation cleanup", () => {
  it("Hero CTA를 존재하는 화면에 연결한다", () => {
    render(<Hero />);
    expect(screen.getByRole("link", { name: "Explore Collection" }).getAttribute("href")).toBe("/shop");
    expect(screen.getByRole("link", { name: /Try AI Studio/ }).getAttribute("href")).toBe("/try-on");
  });

  it("로그인 홈의 기존 AI COORDINATOR 진입점을 유지한다", () => {
    sessionState.authenticated = true;
    render(<Hero />);
    expect(screen.getByText("AI COORDINATOR Mira")).toBeTruthy();
    sessionState.authenticated = false;
  });

  it("상품 전체 보기 링크와 실제 상품만 렌더링한다", () => {
    const product = { id: "p1", name: "Jacket" };
    render(<ProductGrid products={[product] as never} />);
    expect(screen.getByRole("link", { name: "View All" }).getAttribute("href")).toBe("/shop");
    expect(screen.getAllByRole("link", { name: "Jacket" })).toHaveLength(1);
  });

  it("준비되지 않은 support와 social 가짜 링크를 노출하지 않는다", () => {
    const { container } = render(<Footer />);
    expect(container.querySelector('a[href="#"]')).toBeNull();
    expect(screen.queryByText("FAQ")).toBeNull();
  });
});
