import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminShell } from "./AdminShell";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));

describe("admin shell accessibility", () => {
  it("provides one menu and a focusable skip target without nesting main landmarks", () => {
    // Given: existing admin pages already own their main landmark
    // When: the shell renders the page
    render(<AdminShell><main>운영 본문</main></AdminShell>);
    // Then: navigation and skip access are shared, the page remains the sole main
    expect(screen.getAllByRole("navigation", { name: "관리자 메뉴" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "관리자 본문으로 건너뛰기" }).getAttribute("href")).toBe("#admin-content");
    expect(document.getElementById("admin-content")?.tabIndex).toBe(-1);
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "고객 사이트 보기 ↗" }).getAttribute("href")).toBe("/");
  });
});
