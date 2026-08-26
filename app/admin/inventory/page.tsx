import Link from "next/link";
import { AdminInventoryAdjustmentPanel } from "@/components/admin/AdminInventoryAdjustmentPanel";
import { AdminInventoryProductThumbnail } from "@/components/admin/AdminInventoryProductThumbnail";
import { INVENTORY_FILTERS, listAdminInventory, parseAdminInventoryQuery } from "@/lib/admin-inventory";

const FILTER_LABELS = { all: "전체", "low-stock": "저재고", "sold-out": "품절", "manual-sold-out": "수동 품절" } as const;

export default async function AdminInventoryPage({ searchParams }: { readonly searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const source = await searchParams;
  const params = new URLSearchParams();
  if (typeof source.q === "string") params.set("q", source.q);
  if (typeof source.filter === "string") params.set("filter", source.filter);
  if (typeof source.page === "string") params.set("page", source.page);
  const data = await listAdminInventory(parseAdminInventoryQuery(params));
  const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize));
  const query = typeof source.q === "string" ? source.q.trim() : "";
  const requestedFilter = params.get("filter");
  const filter = INVENTORY_FILTERS.find((candidate) => candidate === requestedFilter) ?? "all";
  const hasActiveFilters = Boolean(query) || filter !== "all";
  const activeFilterSummary = [query ? `검색 “${query}”` : null, filter !== "all" ? FILTER_LABELS[filter] : null].filter(Boolean).join(" · ");
  const pageHref = (page: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(page));
    return `/admin/inventory?${next.toString()}`;
  };
  return <main className="min-h-screen bg-black px-4 py-10 text-white"><div className="mx-auto max-w-5xl space-y-6"><header><h1 className="text-3xl font-black">재고 운영</h1><p className="mt-2 text-sm text-zinc-400">입고·정정·폐기는 사유와 전후 수량을 기록합니다. 판매 중지 상품은 여기에서 제외됩니다.</p></header><form className="flex flex-wrap gap-2"><input name="q" defaultValue={typeof source.q === "string" ? source.q : ""} aria-label="상품 또는 브랜드 검색" placeholder="상품 또는 브랜드 검색" className="min-w-0 flex-1 rounded bg-zinc-900 px-3 py-2" /><select name="filter" defaultValue={filter} className="rounded bg-zinc-900 px-3 py-2">{INVENTORY_FILTERS.map((inventoryFilter) => <option key={inventoryFilter} value={inventoryFilter}>{FILTER_LABELS[inventoryFilter]}</option>)}</select><button className="rounded bg-white px-4 py-2 font-bold text-black">검색</button></form><div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-400">{hasActiveFilters ? <><span>현재 조건: {activeFilterSummary}</span><span aria-hidden>·</span><Link href="/admin/inventory" className="underline hover:text-white">초기화</Link></> : <span>전체 목록</span>}<span aria-hidden>·</span><span>조건 일치 {data.total}개 옵션</span></div><div className="space-y-3">{data.items.map((variant) => <section key={variant.id} className="rounded border border-zinc-800 p-3"><div className="mb-2 flex items-center justify-between gap-3"><AdminInventoryProductThumbnail imageUrl={variant.product.imageUrl} productName={variant.product.name} /><div className="min-w-0 flex-1"><Link href={`/admin/products/${variant.product.id}/edit`} className="font-bold hover:underline">{variant.product.name}</Link><p className="text-xs text-zinc-400">{variant.product.brand}</p></div></div><AdminInventoryAdjustmentPanel variant={variant} /></section>)}</div>{data.items.length === 0 ? <p className="py-10 text-center text-zinc-400">조건에 맞는 옵션이 없습니다.</p> : null}<nav aria-label="재고 페이지" className="flex items-center justify-center gap-3"><Link aria-disabled={data.page <= 1} className={data.page <= 1 ? "pointer-events-none text-zinc-600" : "underline"} href={pageHref(Math.max(1, data.page - 1))}>이전</Link><span className="text-sm text-zinc-400">{data.page} / {pageCount}</span><Link aria-disabled={data.page >= pageCount} className={data.page >= pageCount ? "pointer-events-none text-zinc-600" : "underline"} href={pageHref(Math.max(1, data.page + 1))}>다음</Link></nav></div></main>;
}
