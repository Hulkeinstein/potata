"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { CATALOG_CATEGORIES, catalogQueryParams, parseAdminCatalogQuery } from "@/lib/admin-catalog-query";
import { AdminInventoryProductThumbnail } from "./AdminInventoryProductThumbnail";
import { getProductContentGaps, PRODUCT_CONTENT_GAP_LABELS, PRODUCT_CONTENT_QUALITY_OPTIONS } from "@/lib/product-content-quality";

type CatalogItem = {
  readonly id: string;
  readonly name: string;
  readonly brand: string;
  readonly price: number;
  readonly imageUrl: string;
  readonly descriptionKo?: string | null;
  readonly descriptionEn?: string | null;
  readonly isActive: boolean;
  readonly category: string;
  readonly variants: readonly { readonly stock: number; readonly isManuallySoldOut: boolean }[];
};
type CatalogPage = {
  readonly items: readonly CatalogItem[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
};
const fieldClass = "mt-1 w-full min-w-0 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white";
const buttonClass = "rounded border border-zinc-600 px-3 py-2 text-sm disabled:opacity-40";

export function AdminProductCatalogClient({ initialData: data }: { readonly initialData: CatalogPage }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applied = parseAdminCatalogQuery(new URLSearchParams(searchParams.toString()));
  const queryString = catalogQueryParams(applied).toString();
  const returnTo = queryString ? `/admin/products?${queryString}` : "/admin/products";
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const pageCount = Math.min(100, Math.max(1, Math.ceil(data.total / data.pageSize)));
  const pageSizes = [...new Set([10, 20, 50, applied.pageSize])].sort((left, right) => left - right);
  function pageUrl(page: number) {
    return `/admin/products?${catalogQueryParams({ ...applied, page })}`;
  }
  async function toggle(item: CatalogItem) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/catalog/${encodeURIComponent(item.id)}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }), signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        setMessage("판매 상태를 변경하지 못했습니다. 다시 시도해 주세요.");
        return;
      }
      startTransition(() => router.refresh());
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setMessage("판매 상태를 변경하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return <section className="mx-auto max-w-6xl space-y-5" aria-busy={busy || pending}>
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-black">상품 관리</h1><p className="mt-2 text-sm text-zinc-400">상품을 찾아 정보와 대표 사진을 수정하고, 노출 상태를 관리합니다.</p></div>
      <Link className="rounded bg-brand-neon px-4 py-2 font-bold text-black" href="/admin/products/new">상품 등록</Link>
    </header>
    <form key={queryString} action="/admin/products" method="get" className="rounded border border-zinc-800 bg-zinc-950 p-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label className="min-w-0 text-xs text-zinc-400">상품 또는 브랜드 검색<input name="q" maxLength={100} defaultValue={applied.query} className={fieldClass} placeholder="상품명 또는 브랜드" /></label>
        <label className="min-w-0 text-xs text-zinc-400">브랜드<input name="brand" maxLength={100} defaultValue={applied.brand} className={fieldClass} placeholder="브랜드명 정확히 입력" /></label>
        <label className="text-xs text-zinc-400">카테고리<select name="category" defaultValue={applied.category} className={fieldClass}><option value="">전체 카테고리</option>{CATALOG_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="text-xs text-zinc-400">판매 상태<select name="status" defaultValue={applied.status} className={fieldClass}><option value="all">전체 상태</option><option value="active">판매 중</option><option value="sold-out">품절</option><option value="inactive">판매 중지</option></select></label>
        <label className="text-xs text-zinc-400">정보 누락<select name="quality" defaultValue={applied.quality} className={fieldClass}>{PRODUCT_CONTENT_QUALITY_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-xs text-zinc-400">정렬<select name="sort" defaultValue={applied.sort} className={fieldClass}><option value="newest">최근 등록순</option><option value="name">상품명순</option><option value="price-asc">가격 낮은순</option><option value="price-desc">가격 높은순</option></select></label>
        <label className="text-xs text-zinc-400">페이지당 상품<select name="pageSize" defaultValue={applied.pageSize} className={fieldClass}>{pageSizes.map((size) => <option key={size} value={size}>{size}개</option>)}</select></label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3"><button disabled={busy || pending} className="rounded bg-white px-4 py-2 text-sm font-bold text-black">조건 적용</button><Link className="text-sm text-zinc-400 underline" href="/admin/products">조건 초기화</Link><span className="text-xs text-zinc-500">조건을 바꾸면 첫 페이지부터 표시합니다.</span></div>
      <p className="mt-3 text-xs leading-relaxed text-zinc-500">한·영 설명 칸의 작성 여부를 확인합니다. 다른 언어나 기존 원문으로 대체 표시될 수 있습니다. 사진은 대표 URL 등록 여부만 확인하며, 실제 접속 실패는 누락으로 분류하지 않습니다.</p>
    </form>
    {message ? <p role="alert" className="rounded border border-red-900 p-3 text-sm text-red-300">{message}</p> : null}
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><p className="text-zinc-300">조회 결과 <strong>{data.total}</strong>개</p><span className="text-xs text-zinc-500">재고 총량은 수동 품절 옵션을 포함합니다.</span></div>
    <ul className="space-y-3">{data.items.map((item) => {
      const availableCount = item.variants.filter((variant) => variant.stock > 0 && !variant.isManuallySoldOut).length;
      const stock = item.variants.reduce((sum, variant) => sum + variant.stock, 0);
      const status = item.isActive ? (availableCount > 0 ? "판매 중" : "품절") : "판매 중지";
      const contentGaps = getProductContentGaps(item);
      return <li key={item.id} className="grid gap-3 rounded border border-zinc-800 bg-zinc-950 p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center lg:gap-6">
        <div className="flex min-w-0 gap-3"><AdminInventoryProductThumbnail key={item.imageUrl} imageUrl={item.imageUrl} productName={item.name} /><div className="min-w-0"><p className="text-xs text-zinc-400">{item.brand} · {item.category}</p><h2 className="mt-1 break-words font-bold">{item.name}</h2><p className="mt-1 font-mono text-sm">AED {item.price.toLocaleString("en-US")}</p>{contentGaps.length > 0 ? <div className="mt-2 flex flex-wrap gap-1">{contentGaps.map((gap) => <span key={gap} className="rounded border border-amber-900 bg-amber-950/30 px-2 py-1 text-xs text-amber-200">{PRODUCT_CONTENT_GAP_LABELS[gap]}</span>)}</div> : null}</div></div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs lg:block lg:space-y-1"><p className={status === "판매 중" ? "text-emerald-400" : "text-amber-400"}>{status}</p><p className="text-zinc-400">재고 총량 {stock} · 구매 가능 옵션 {availableCount}/{item.variants.length}</p></div>
        <div className="flex flex-wrap gap-2"><Link className={buttonClass} href={`/admin/products/${encodeURIComponent(item.id)}/edit?returnTo=${encodeURIComponent(returnTo)}`}>수정</Link><button className={buttonClass} disabled={busy || pending} onClick={() => void toggle(item)}>{item.isActive ? "판매 중지" : "재노출"}</button></div>
      </li>;
    })}</ul>
    {data.items.length === 0 ? <div className="rounded border border-dashed border-zinc-700 py-12 text-center"><p className="text-zinc-400">조건에 맞는 상품이 없습니다.</p><Link href="/admin/products" className="mt-3 inline-block text-sm text-brand-neon underline">전체 상품 보기</Link></div> : null}
    <nav aria-label="상품 목록 페이지" className="flex items-center justify-center gap-4">
      {data.page > 1 ? <Link className={buttonClass} href={pageUrl(data.page - 1)}>이전</Link> : <span className={`${buttonClass} opacity-40`}>이전</span>}
      <span className="text-sm text-zinc-400">{data.page} / {pageCount}</span>
      {data.page < pageCount ? <Link className={buttonClass} href={pageUrl(data.page + 1)}>다음</Link> : <span className={`${buttonClass} opacity-40`}>다음</span>}
    </nav>
  </section>;
}
