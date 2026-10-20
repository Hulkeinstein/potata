import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminCatalogSavedViews } from "./AdminCatalogSavedViews";
import { catalogViewsStorageKey } from "@/lib/admin-catalog-saved-views";
import { renderToString } from "react-dom/server";
const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
afterEach(() => { vi.restoreAllMocks(); });

describe("named catalog views", () => {
  it("saves applied filters and restores them after remount with page one", async () => {
    const view = render(<AdminCatalogSavedViews storageScope="admin" appliedQuery="quality=missing-ko&page=8" busy={false} />);
    fireEvent.change(screen.getByLabelText("보기 이름"), { target: { value: "한국어 누락" } });
    fireEvent.click(screen.getByRole("button", { name: "현재 조건 저장" }));
    expect(screen.getByRole("status").textContent).toContain("저장");
    view.unmount();
    render(<AdminCatalogSavedViews storageScope="admin" appliedQuery="status=inactive" busy={false} />);
    fireEvent.change(screen.getByLabelText("저장한 보기 선택"), { target: { value: JSON.parse(localStorage.getItem(catalogViewsStorageKey("admin")) ?? "{}").views[0].id } });
    fireEvent.click(screen.getByRole("button", { name: "불러오기" }));
    expect(mocks.push).toHaveBeenCalledWith("/admin/products?quality=missing-ko");
  });
  it("confirms deletion and cancellation keeps the original view", () => {
    localStorage.setItem(catalogViewsStorageKey("admin"), JSON.stringify({ version: 1, views: [{ id: "one", name: "Original", query: "" }] }));
    render(<AdminCatalogSavedViews storageScope="admin" appliedQuery="" busy={false} />);
    fireEvent.change(screen.getByLabelText("저장한 보기 선택"), { target: { value: "one" } });
    fireEvent.click(screen.getByRole("button", { name: "보기 삭제" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "취소" }));
    expect(localStorage.getItem(catalogViewsStorageKey("admin"))).toContain("Original");
    fireEvent.click(screen.getByRole("button", { name: "보기 삭제" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "삭제 실행" }));
    expect(localStorage.getItem(catalogViewsStorageKey("admin"))).not.toContain("Original");
  });
  it("does not report success or replace persisted values when writing fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    render(<AdminCatalogSavedViews storageScope="admin" appliedQuery="" busy={false} />);
    fireEvent.change(screen.getByLabelText("보기 이름"), { target: { value: "Name" } });
    fireEvent.click(screen.getByRole("button", { name: "현재 조건 저장" }));
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("reflects storage events and isolates account scopes", async () => {
    const { rerender } = render(<AdminCatalogSavedViews storageScope="a" appliedQuery="" busy={false} />);
    localStorage.setItem(catalogViewsStorageKey("a"), JSON.stringify({ version: 1, views: [{ id: "one", name: "Other tab", query: "" }] }));
    fireEvent(window, new StorageEvent("storage", { key: catalogViewsStorageKey("a") }));
    await waitFor(() => expect(screen.getByRole("option", { name: "Other tab" })).toBeTruthy());
    rerender(<AdminCatalogSavedViews storageScope="b" appliedQuery="" busy={false} />);
    expect(screen.queryByRole("option", { name: "Other tab" })).toBeNull();
  });
  it("disables writes without a scope or while a bulk request is running", () => {
    const { rerender } = render(<AdminCatalogSavedViews appliedQuery="" busy={false} />);
    expect(screen.getByRole("button", { name: "현재 조건 저장" }).hasAttribute("disabled")).toBe(true);
    rerender(<AdminCatalogSavedViews storageScope="admin" appliedQuery="" busy />);
    expect(screen.getByRole("button", { name: "현재 조건 저장" }).hasAttribute("disabled")).toBe(true);
  });
  it("renders a stable server snapshot without reading localStorage", () => {
    const read = vi.spyOn(Storage.prototype, "getItem");
    expect(renderToString(<AdminCatalogSavedViews storageScope="admin" appliedQuery="" busy={false} />)).toContain("저장한 보기");
    expect(read).not.toHaveBeenCalled();
  });
  it("preserves corrupt data and blocks mutation rather than resetting it", () => {
    const key = catalogViewsStorageKey("admin");
    localStorage.setItem(key, "corrupt");
    render(<AdminCatalogSavedViews storageScope="admin" appliedQuery="" busy={false} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: "현재 조건 저장" }).hasAttribute("disabled")).toBe(true);
    expect(localStorage.getItem(key)).toBe("corrupt");
  });
  it("handles a blocked browser storage reader without hydration or render failure", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    render(<AdminCatalogSavedViews storageScope="admin" appliedQuery="" busy={false} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: "현재 조건 저장" }).hasAttribute("disabled")).toBe(true);
  });
  it("closes deletion on Escape and restores the initiating button", () => {
    const key = catalogViewsStorageKey("admin");
    localStorage.setItem(key, JSON.stringify({ version: 1, views: [{ id: "one", name: "Original", query: "" }] }));
    render(<AdminCatalogSavedViews storageScope="admin" appliedQuery="" busy={false} />);
    fireEvent.change(screen.getByLabelText("저장한 보기 선택"), { target: { value: "one" } });
    const opener = screen.getByRole("button", { name: "보기 삭제" });
    opener.focus(); fireEvent.click(opener);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(localStorage.getItem(key)).toContain("Original");
  });
  it("does not expose another account's pending deletion after scope changes", () => {
    localStorage.setItem(catalogViewsStorageKey("a"), JSON.stringify({ version: 1, views: [{ id: "one", name: "Private A", query: "" }] }));
    const { rerender } = render(<AdminCatalogSavedViews storageScope="a" appliedQuery="" busy={false} />);
    fireEvent.change(screen.getByLabelText("저장한 보기 선택"), { target: { value: "one" } });
    fireEvent.click(screen.getByRole("button", { name: "보기 삭제" }));
    rerender(<AdminCatalogSavedViews storageScope="b" appliedQuery="" busy={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Private A")).toBeNull();
  });
});
