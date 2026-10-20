import { describe, expect, it } from "vitest";
import { canonicalSavedCatalogQuery, parseSavedCatalogViews, saveCatalogView, removeCatalogView, catalogViewsStorageKey } from "./admin-catalog-saved-views";

function storage(raw: string | null = null) {
  let value = raw;
  return { getItem: () => value, setItem: (_key: string, next: string) => { value = next; } };
}
const one = { id: "one", name: "한국어 누락", query: "quality=missing-ko" };
describe("saved catalog view boundaries", () => {
  it("canonicalizes existing filters while discarding page", () => {
    expect(canonicalSavedCatalogQuery("page=4&brand=Seoul&quality=missing-ko&sort=name&pageSize=50")).toBe("brand=Seoul&quality=missing-ko&sort=name&pageSize=50");
  });
  it.each(["https://evil.test", "redirect=https://evil.test", "q=a&q=b", "x".repeat(4097)])("rejects untrusted query %s", (query) => { expect(canonicalSavedCatalogQuery(query)).toBeNull(); });
  it("parses versioned views and rejects malformed or ambiguous payloads", () => {
    expect(parseSavedCatalogViews(JSON.stringify({ version: 1, views: [one] }))).toEqual({ ok: true, views: [one] });
    for (const value of ["{", JSON.stringify({ version: 2, views: [] }), JSON.stringify({ version: 1, views: [one, one] }), JSON.stringify({ version: 1, views: [{ ...one, extra: true }] }), "x".repeat(102401)]) expect(parseSavedCatalogViews(value).ok).toBe(false);
  });
  it("rejects normalized duplicate names and twenty-one views", () => {
    const views = Array.from({ length: 20 }, (_, i) => ({ id: `id-${i}`, name: `View ${i}`, query: "" }));
    const store = storage(JSON.stringify({ version: 1, views }));
    expect(saveCatalogView(store, "admin", "More", "", "new").ok).toBe(false);
    const duplicates = storage(JSON.stringify({ version: 1, views: [{ ...one, name: "ＡＢＣ" }] }));
    expect(saveCatalogView(duplicates, "admin", "abc", "", "new").ok).toBe(false);
  });
  it("fresh-reads before saving and removes only the specified view", () => {
    const store = storage(JSON.stringify({ version: 1, views: [one] }));
    expect(saveCatalogView(store, "admin", " Second ", "page=8&status=inactive", "two")).toEqual({ ok: true, views: [one, { id: "two", name: "Second", query: "status=inactive" }] });
    expect(removeCatalogView(store, "admin", "one")).toEqual({ ok: true, views: [{ id: "two", name: "Second", query: "status=inactive" }] });
    expect(catalogViewsStorageKey("admin-a")).not.toBe(catalogViewsStorageKey("admin-b"));
  });
  it("preserves corrupt storage and reports write/read failures", () => {
    const store = storage("corrupt");
    expect(saveCatalogView(store, "admin", "Name", "", "new").ok).toBe(false);
    expect(store.getItem()).toBe("corrupt");
    expect(saveCatalogView({ getItem: () => null, setItem: () => { throw new Error("quota"); } }, "admin", "Name", "", "new").ok).toBe(false);
    expect(removeCatalogView({ getItem: () => { throw new Error("blocked"); }, setItem: () => {} }, "admin", "one").ok).toBe(false);
  });
  it.each(["", " ", "x".repeat(41), "line\nname", "line\n"])("rejects invalid name %j", (name) => { expect(saveCatalogView(storage(), "admin", name, "", "id").ok).toBe(false); });
  it("accepts exactly forty name characters and preserves unrelated latest entries on deletion", () => {
    const store = storage();
    expect(saveCatalogView(store, "admin", "x".repeat(40), "", "one").ok).toBe(true);
    store.setItem("unused", JSON.stringify({ version: 1, views: [{ id: "one", name: "x".repeat(40), query: "" }, { id: "two", name: "Other tab", query: "status=inactive" }] }));
    expect(removeCatalogView(store, "admin", "one")).toEqual({ ok: true, views: [{ id: "two", name: "Other tab", query: "status=inactive" }] });
  });
  it.each([{ ...one, id: "" }, { ...one, id: "x".repeat(81) }, { ...one, name: "" }, { ...one, query: "https://evil.test" }])("rejects invalid stored entries %j", (view) => {
    expect(parseSavedCatalogViews(JSON.stringify({ version: 1, views: [view] })).ok).toBe(false);
  });
});
