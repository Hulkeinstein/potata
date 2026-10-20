import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerChrome } from "./CustomerChrome";

const { pathname } = vi.hoisted(() => ({ pathname: { value: "/" } }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));
vi.mock("./Navbar", () => ({ Navbar: () => <nav>고객 메뉴</nav> }));
vi.mock("./Footer", () => ({ Footer: () => <footer>고객 Footer</footer> }));
vi.mock("./InitialLoader", () => ({ InitialLoader: () => <div>고객 intro</div> }));

function Chrome() {
  return <><CustomerChrome placement="header" /><p>페이지 본문</p><CustomerChrome placement="footer" /></>;
}

describe("customer chrome route boundary", () => {
  beforeEach(() => { pathname.value = "/"; });

  it.each(["/admin", "/admin/", "/admin/products/new"])("omits shopping chrome on %s", (path) => {
    // Given: an exact admin path or its descendant
    pathname.value = path;
    // When: the shared root chrome renders
    render(<Chrome />);
    // Then: only the page content remains
    expect(screen.queryByText("고객 메뉴")).toBeNull();
    expect(screen.queryByText("고객 Footer")).toBeNull();
    expect(screen.queryByText("고객 intro")).toBeNull();
    expect(screen.getByText("페이지 본문")).toBeTruthy();
  });

  it.each(["/", "/shop", "/administrator"])("retains shopping chrome on %s", (path) => {
    // Given: a non-admin route, including a similar prefix
    pathname.value = path;
    // When: chrome renders
    render(<Chrome />);
    // Then: the existing three customer elements remain
    expect(screen.getByText("고객 메뉴")).toBeTruthy();
    expect(screen.getByText("고객 Footer")).toBeTruthy();
    expect(screen.getByText("고객 intro")).toBeTruthy();
  });

  it("restores shopping chrome after client navigation out of admin", () => {
    // Given: chrome hidden on admin
    pathname.value = "/admin";
    const view = render(<Chrome />);
    // When: navigation returns to a customer page
    pathname.value = "/for-you";
    view.rerender(<Chrome />);
    // Then: customer navigation returns without replacing the page boundary
    expect(screen.getByText("고객 메뉴")).toBeTruthy();
    expect(screen.getByText("고객 Footer")).toBeTruthy();
  });
});
