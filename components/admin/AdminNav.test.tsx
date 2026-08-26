import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminNav } from "@/components/admin/AdminNav";

vi.mock("next/link", () => ({
  default: ({ children, href }: { readonly children: React.ReactNode; readonly href: string }) => <a href={href}>{children}</a>,
}));

describe("AdminNav", () => {
  it("links operators to the Q&A inbox", () => {
    // Given: an authenticated operator viewing the shared navigation
    render(<AdminNav />);

    // When: they choose Q&A management

    // Then: the inbox route is available from every admin page
    expect(screen.getByRole("link", { name: "Q&A" }).getAttribute("href")).toBe("/admin/questions");
  });
});
