import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MyPage from "./page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ status: "authenticated", data: { user: { id: "u1", name: "Mira", email: "mira@example.com" } } }), signOut: vi.fn() }));
vi.mock("next/image", () => ({ default: ({ alt }: { readonly alt: string }) => <span role="img" aria-label={alt} /> }));
vi.mock("next/link", () => ({ default: ({ children, href }: { readonly children: React.ReactNode; readonly href: string }) => <a href={href}>{children}</a> }));
vi.mock("framer-motion", () => ({ motion: { div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>, button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> } }));

describe("MyPage navigation", () => {
  it("설명형 My Posts 링크를 정확히 한 번 표시한다", () => {
    render(<MyPage />);
    const link = screen.getByRole("link", { name: /My Posts/ });
    expect(link.getAttribute("href")).toBe("/mypage/posts");
    expect(screen.getAllByText("My Posts")).toHaveLength(1);
    expect(screen.getByText("OOTD · Reviews · Q&A 관리")).toBeTruthy();
  });

  it("지원되는 메뉴를 실제 경로로 연결한다", () => {
    render(<MyPage />);
    expect(screen.getByRole("link", { name: /Wishlist/ }).getAttribute("href")).toBe("/liked");
    expect(screen.getByRole("link", { name: /Settings/ }).getAttribute("href")).toBe("/mypage/settings");
    expect(screen.getByRole("link", { name: /Benefits/ }).getAttribute("href")).toBe("/mypage/benefits");
  });
});
