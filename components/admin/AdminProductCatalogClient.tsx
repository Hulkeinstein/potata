"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type CatalogItem = {
  readonly id: string;
  readonly name: string;
  readonly brand: string;
  readonly price: number;
  readonly imageUrl: string;
  readonly isActive: boolean;
  readonly category: string;
  readonly description: string | null;
  readonly originalPrice: number | null;
  readonly discountRate: number | null;
  readonly variants: readonly { readonly stock: number; readonly isManuallySoldOut: boolean }[];
};

type CatalogPage = {
  readonly items: readonly CatalogItem[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
};

export function AdminProductCatalogClient({ initialData }: { readonly initialData: CatalogPage }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function load(page: number, nextQuery = query) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), q: nextQuery });
    const response = await fetch(`/api/admin/catalog?${params}`);
    const payload: unknown = await response.json();
    if (!response.ok || !payload || typeof payload !== "object" || !("data" in payload)) {
      setMessage("상품 목록을 불러오지 못했습니다.");
    } else {
      setData(payload.data as CatalogPage);
      router.replace(`/admin/products?${params}`);
      setMessage("");
    }
    setLoading(false);
  }

  async function toggle(item: CatalogItem) {
    setLoading(true);
    const response = await fetch(`/api/admin/catalog/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, isActive: !item.isActive }),
    });
    if (!response.ok) setMessage("판매 상태를 변경하지 못했습니다.");
    else await load(data.page);
    setLoading(false);
  }

  const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize));
  return <section className="mx-auto max-w-5xl space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-black">Product Catalog</h1><p className="mt-1 text-sm text-zinc-400">등록 상품을 수정하거나 판매 상태를 관리합니다.</p></div><Link className="rounded bg-brand-neon px-4 py-2 font-bold text-black" href="/admin/products/new">상품 등록</Link></div>
    <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void load(1); }}><input aria-label="상품 또는 브랜드 검색" className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상품명 또는 브랜드 검색" /><button className="rounded bg-white px-4 py-2 font-bold text-black" disabled={loading}>검색</button></form>
    {message ? <p role="alert" className="text-sm text-red-400">{message}</p> : null}
    <p className="text-sm text-zinc-400">총 {data.total}개</p>
    <ul className="space-y-2">{data.items.map((item) => {
      const available = item.variants.some((variant) => variant.stock > 0 && !variant.isManuallySoldOut);
      const stock = item.variants.reduce((sum, variant) => sum + variant.stock, 0);
      const status = item.isActive ? (available ? "판매 중" : "품절") : "판매 중지";
      return <li key={item.id} className="flex items-center gap-3 rounded border border-zinc-800 bg-zinc-950 p-3"><Image src={item.imageUrl} alt="" width={48} height={56} unoptimized className="h-14 w-12 rounded object-cover" /><div className="min-w-0 flex-1"><p className="truncate font-bold">{item.name}</p><p className="text-sm text-zinc-400">{item.brand} · AED {item.price}</p><p className={status === "판매 중" ? "text-xs text-emerald-400" : "text-xs text-amber-400"}>{status} · 재고 {stock}</p></div><div className="flex shrink-0 gap-2"><Link className="rounded border border-zinc-600 px-3 py-2 text-sm" href={`/admin/products/${item.id}/edit`}>수정</Link><button className="rounded border border-zinc-600 px-3 py-2 text-sm" disabled={loading} onClick={() => void toggle(item)}>{item.isActive ? "판매 중지" : "재노출"}</button></div></li>;
    })}</ul>
    {data.items.length === 0 ? <p className="py-12 text-center text-zinc-400">조건에 맞는 상품이 없습니다.</p> : null}
    <div className="flex items-center justify-center gap-3"><button disabled={loading || data.page <= 1} onClick={() => void load(data.page - 1)} className="rounded border border-zinc-700 px-3 py-2 disabled:opacity-40">이전</button><span className="text-sm text-zinc-400">{data.page} / {pageCount}</span><button disabled={loading || data.page >= pageCount} onClick={() => void load(data.page + 1)} className="rounded border border-zinc-700 px-3 py-2 disabled:opacity-40">다음</button></div>
  </section>;
}
