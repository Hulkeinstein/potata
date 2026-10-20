import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminProductCatalogClient } from "./AdminProductCatalogClient";
const mocks = vi.hoisted(() => ({ refresh: vi.fn(), params: "brand=Seoul&status=inactive&page=2" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }), useSearchParams: () => new URLSearchParams(mocks.params) }));
const item = { id: "p1", name: "Test Tee", brand: "Seoul", price: 120, imageUrl: "https://image.test/a.jpg", isActive: false, category: "Top", description: null, originalPrice: null, discountRate: null, variants: [{ stock: 5, isManuallySoldOut: false }] };
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); mocks.params = "brand=Seoul&status=inactive&page=2"; });
describe("admin product catalog workflow", () => {
  it("shows useful filters and carries applied conditions into editing", () => {
    render(<AdminProductCatalogClient initialData={{ items: [item], total: 21, page: 2, pageSize: 20 }} />);
    expect(screen.getByLabelText("판매 상태")).toBeTruthy();
    expect(screen.getByLabelText("카테고리")).toBeTruthy();
    expect(screen.getByRole("link", { name: "수정" }).getAttribute("href")).toContain("returnTo=%2Fadmin%2Fproducts%3Fbrand%3DSeoul%26status%3Dinactive%26page%3D2");
  });
  it("sends only visibility when restoring a product", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true })));
    vi.stubGlobal("fetch", fetcher);
    render(<AdminProductCatalogClient initialData={{ items: [item], total: 1, page: 1, pageSize: 20 }} />);
    fireEvent.click(screen.getByRole("button", { name: "재노출" }));
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(fetcher.mock.calls[0]?.[0]).toBe("/api/admin/catalog/p1/status");
    expect(fetcher.mock.calls[0]?.[1].body).toBe(JSON.stringify({ isActive: true }));
  });
  it("keeps the product and releases the button when network fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
    render(<AdminProductCatalogClient initialData={{ items: [item], total: 1, page: 1, pageSize: 20 }} />);
    fireEvent.click(screen.getByRole("button", { name: "재노출" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByText("Test Tee")).toBeTruthy();
    expect(screen.getByRole("button", { name: "재노출" }).hasAttribute("disabled")).toBe(false);
  });
  it("renders refreshed server data instead of retaining a shadow copy", () => {
    const { rerender } = render(<AdminProductCatalogClient initialData={{ items: [item], total: 1, page: 1, pageSize: 20 }} />);
    rerender(<AdminProductCatalogClient initialData={{ items: [{ ...item, name: "Updated Tee" }], total: 1, page: 1, pageSize: 20 }} />);
    expect(screen.getByText("Updated Tee")).toBeTruthy();
    expect(screen.queryByText("Test Tee")).toBeNull();
  });
  it("shows a valid nonstandard applied page size without misrepresenting it", () => {
    mocks.params = "pageSize=15";
    render(<AdminProductCatalogClient initialData={{ items: [item], total: 1, page: 1, pageSize: 15 }} />);
    expect(screen.getByLabelText("페이지당 상품").getAttribute("name")).toBe("pageSize");
    expect(screen.getByRole("option", { name: "15개" }).getAttribute("value")).toBe("15");
  });
});
