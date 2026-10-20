export const CATALOG_CATEGORIES = ["Outer", "Top", "Bottom", "Dress", "Acc", "Shoes"] as const;
export const CATALOG_STATUSES = ["all", "active", "inactive", "sold-out"] as const;
export const CATALOG_SORTS = ["newest", "name", "price-asc", "price-desc"] as const;

export type AdminCatalogQuery = {
  readonly query: string;
  readonly brand: string;
  readonly category: string;
  readonly status: typeof CATALOG_STATUSES[number];
  readonly sort: typeof CATALOG_SORTS[number];
  readonly page: number;
  readonly pageSize: number;
};

function choice<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  return options.find((option) => option === value) ?? fallback;
}

function positive(value: string | null, fallback: number, max: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

export function parseAdminCatalogQuery(params: URLSearchParams): AdminCatalogQuery {
  return {
    query: (params.get("q") ?? "").trim().slice(0, 100),
    brand: (params.get("brand") ?? "").trim().slice(0, 100),
    category: choice(params.get("category"), CATALOG_CATEGORIES, ""),
    status: choice(params.get("status"), CATALOG_STATUSES, "all"),
    sort: choice(params.get("sort"), CATALOG_SORTS, "newest"),
    page: positive(params.get("page"), 1, 100),
    pageSize: positive(params.get("pageSize"), 20, 50),
  };
}

export function catalogQueryParams(input: AdminCatalogQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (input.query) params.set("q", input.query);
  if (input.brand) params.set("brand", input.brand);
  if (input.category) params.set("category", input.category);
  if (input.status !== "all") params.set("status", input.status);
  if (input.sort !== "newest") params.set("sort", input.sort);
  if (input.page !== 1) params.set("page", String(input.page));
  if (input.pageSize !== 20) params.set("pageSize", String(input.pageSize));
  return params;
}

export function safeCatalogReturnTo(value: string | undefined): string {
  if (!value || !/^\/admin\/products(?:\?|$)/.test(value)) return "/admin/products";
  const url = new URL(value, "http://catalog.local");
  if (url.pathname !== "/admin/products") return "/admin/products";
  const query = catalogQueryParams(parseAdminCatalogQuery(url.searchParams)).toString();
  return query ? `/admin/products?${query}` : "/admin/products";
}
