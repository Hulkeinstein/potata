import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }), useSearchParams: () => new URLSearchParams("quality=missing-ko&brand=QA") }));
import { AdminProductCatalogClient } from "./AdminProductCatalogClient";

describe("catalog content quality workflow", () => {
  it("shows a quality filter and exact missing badges while preserving edit conditions", () => {
    const item = { id: "p1", name: "QA Tee", brand: "QA", price: 100, imageUrl: " ", descriptionKo: null, descriptionEn: "English", isActive: false, category: "Top", variants: [] };
    render(<AdminProductCatalogClient initialData={{ items: [item], total: 1, page: 1, pageSize: 20 }} />);
    expect(screen.getByRole("combobox", { name: "정보 누락" }).getAttribute("name")).toBe("quality");
    const row = within(screen.getByRole("listitem"));
    expect(row.getByText("한국어 설명 없음")).toBeTruthy();
    expect(row.getByText("대표 사진 없음")).toBeTruthy();
    expect(row.queryByText("영어 설명 없음")).toBeNull();
    expect(row.getByRole("link", { name: "수정" }).getAttribute("href")).toContain("quality%3Dmissing-ko");
  });
});
