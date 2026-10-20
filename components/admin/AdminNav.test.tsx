import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminNav } from "@/components/admin/AdminNav";
import type { ComponentProps } from "react";

vi.mock("next/link", () => ({
  default: (props: ComponentProps<"a">) => <a {...props} />,
}));
const { pathname } = vi.hoisted(() => ({ pathname: { value: "/admin/products/new" } }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

describe("AdminNav", () => {
  it("links operators to the Q&A inbox", () => {
    // Given: an authenticated operator viewing the shared navigation
    render(<AdminNav />);

    // When: they choose Q&A management

    // Then: the inbox route is available from every admin page
    expect(screen.getByRole("link", { name: "고객 문의" }).getAttribute("href")).toBe("/admin/questions");
  });

  it("includes the complete existing six Korean work destinations", () => {
    // Given: the existing management routes
    // When: the shared admin navigation renders
    render(<AdminNav />);
    // Then: no duplicate feature routes are invented
    expect(screen.getByRole("link", { name: "운영 홈" }).getAttribute("href")).toBe("/admin");
    expect(screen.getByRole("link", { name: "상품 관리" }).getAttribute("href")).toBe("/admin/products");
    expect(screen.getByRole("link", { name: "재고 운영" }).getAttribute("href")).toBe("/admin/inventory");
    expect(screen.getByRole("link", { name: "쿠폰·포인트" }).getAttribute("href")).toBe("/admin/benefits");
    expect(screen.getByRole("link", { name: "운영 이슈" }).getAttribute("href")).toBe("/admin/operations");
  });

  it.each(["/admin/products/new", "/admin/products/1/edit"])("marks only products current on %s", (path) => {
    // Given: an existing nested product route
    pathname.value = path;
    // When: navigation renders
    render(<AdminNav />);
    // Then: home is not current and product management is current
    expect(screen.getByRole("link", { name: "상품 관리" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "운영 홈" }).hasAttribute("aria-current")).toBe(false);
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it("marks home current only on its exact route", () => {
    // Given: the home route
    pathname.value = "/admin";
    // When: navigation renders
    render(<AdminNav />);
    // Then: only home is current
    expect(screen.getByRole("link", { name: "운영 홈" }).getAttribute("aria-current")).toBe("page");
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });
});
