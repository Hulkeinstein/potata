import { catalogQueryParams, parseAdminCatalogQuery } from "./admin-catalog-query";

export type SavedCatalogView = { readonly id: string; readonly name: string; readonly query: string };
export type CatalogViewsResult = { readonly ok: true; readonly views: readonly SavedCatalogView[] } | { readonly ok: false; readonly error: string };
type ViewStorage = Pick<Storage, "getItem" | "setItem">;
const keys = ["q", "brand", "category", "status", "quality", "sort", "page", "pageSize"] as const;
const invalid = { ok: false, error: "저장한 보기 데이터를 읽지 못했습니다. 기존 저장값은 변경하지 않았습니다." } as const;
const normalizedName = (name: string) => name.normalize("NFKC").toLowerCase();
const validName = (name: string) => name.length > 0 && name.length <= 40 && !/[\u0000-\u001f\u007f]/.test(name);

export function catalogViewsStorageKey(scope: string): string { return `potata:admin-catalog-views:v1:${encodeURIComponent(scope)}`; }

export function canonicalSavedCatalogQuery(query: string): string | null {
  if (query.length > 4096) return null;
  const params = new URLSearchParams(query);
  if ([...params.keys()].some((key) => !keys.some((allowed) => allowed === key) || params.getAll(key).length !== 1)) return null;
  return catalogQueryParams({ ...parseAdminCatalogQuery(params), page: 1 }).toString();
}

export function parseSavedCatalogViews(raw: string | null): CatalogViewsResult {
  if (raw === null) return { ok: true, views: [] };
  if (raw.length > 102400 || new TextEncoder().encode(raw).byteLength > 102400) return invalid;
  let value: unknown;
  try { value = JSON.parse(raw); } catch (error) { if (error instanceof SyntaxError) return invalid; throw error; }
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1 || !("views" in value) || !Array.isArray(value.views) || value.views.length > 20 || Object.keys(value).some((key) => key !== "version" && key !== "views")) return invalid;
  const views: SavedCatalogView[] = [];
  for (const entry of value.views) {
    const item: unknown = entry;
    if (!item || typeof item !== "object" || !("id" in item) || typeof item.id !== "string" || !item.id || item.id.length > 80 || item.id.trim() !== item.id || /[\u0000-\u001f\u007f]/.test(item.id) || !("name" in item) || typeof item.name !== "string" || /[\u0000-\u001f\u007f]/.test(item.name) || !validName(item.name.trim()) || !("query" in item) || typeof item.query !== "string" || Object.keys(item).some((key) => !["id", "name", "query"].includes(key))) return invalid;
    const query = canonicalSavedCatalogQuery(item.query);
    const name = item.name.trim();
    if (query === null || views.some((view) => view.id === item.id || normalizedName(view.name) === normalizedName(name))) return invalid;
    views.push({ id: item.id, name, query });
  }
  return { ok: true, views };
}

export function readCatalogViews(storage: ViewStorage, scope: string): CatalogViewsResult {
  try { return parseSavedCatalogViews(storage.getItem(catalogViewsStorageKey(scope))); }
  catch (error) { if (error instanceof Error) return invalid; throw error; }
}

function persist(storage: ViewStorage, scope: string, views: readonly SavedCatalogView[]): CatalogViewsResult {
  try { storage.setItem(catalogViewsStorageKey(scope), JSON.stringify({ version: 1, views })); return { ok: true, views }; }
  catch (error) { if (error instanceof Error) return { ok: false, error: "이 브라우저에 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인해 주세요." }; throw error; }
}

export function saveCatalogView(storage: ViewStorage, scope: string, inputName: string, inputQuery: string, id: string): CatalogViewsResult {
  const existing = readCatalogViews(storage, scope);
  if (!existing.ok) return existing;
  const name = inputName.trim();
  const query = canonicalSavedCatalogQuery(inputQuery);
  if (/[\u0000-\u001f\u007f]/.test(inputName) || !validName(name) || query === null) return { ok: false, error: "보기 이름은 공백을 제외해 1~40자로 입력하고 적용된 조건을 확인해 주세요." };
  if (existing.views.some((view) => normalizedName(view.name) === normalizedName(name))) return { ok: false, error: "같은 이름의 보기가 있습니다. 다른 이름을 입력해 주세요." };
  if (existing.views.length >= 20) return { ok: false, error: "보기는 최대 20개까지 저장할 수 있습니다." };
  return persist(storage, scope, [...existing.views, { id, name, query }]);
}

export function removeCatalogView(storage: ViewStorage, scope: string, id: string): CatalogViewsResult {
  const existing = readCatalogViews(storage, scope);
  return existing.ok ? persist(storage, scope, existing.views.filter((view) => view.id !== id)) : existing;
}
