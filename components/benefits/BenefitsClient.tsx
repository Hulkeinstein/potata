"use client";

import { useEffect, useState } from "react";

type Coupon = { readonly id: string; readonly name: string; readonly ratePercent: number; readonly minOrderAed: number; readonly maxDiscountAed: number; readonly scope: "ALL_PRODUCTS" | "BRANDS"; readonly brands: readonly string[]; readonly status: "ACTIVE" | "EXPIRED" | "REVOKED"; readonly expiresAt: string | null };
type PointEntry = { readonly id: string; readonly type: "ADMIN_GRANT" | "ADMIN_REVERSAL" | "PURCHASE_EARN"; readonly amount: number; readonly label: string; readonly createdAt: string };
type Benefits = { readonly coupons: readonly Coupon[]; readonly points: { readonly balance: number; readonly entries: readonly PointEntry[]; readonly nextCursor: string | null } };

function isBenefits(value: unknown): value is Benefits {
  if (typeof value !== "object" || value === null || !("coupons" in value) || !("points" in value)) return false;
  const points = value.points;
  return Array.isArray(value.coupons) && typeof points === "object" && points !== null && "balance" in points && typeof points.balance === "number" && "entries" in points && Array.isArray(points.entries) && "nextCursor" in points;
}

export function BenefitsClient() {
  const [data, setData] = useState<Benefits | null>(null);
  const [error, setError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/users/me/benefits");
        const payload: unknown = await response.json();
        if (!response.ok || typeof payload !== "object" || payload === null || !("data" in payload)) throw new Error("load failed");
        const result = payload.data;
        if (!isBenefits(result)) throw new Error("invalid response");
        setData(result);
      } catch (caught) {
        if (caught instanceof Error) setError("혜택 내역을 불러오지 못했습니다.");
      }
    }
    void load();
  }, []);
  async function loadMore() {
    const cursor = data?.points.nextCursor; if (!cursor || loadingMore) return; setLoadingMore(true);
    try {
      const response = await fetch(`/api/users/me/benefits?cursor=${encodeURIComponent(cursor)}`); const payload: unknown = await response.json();
      if (!response.ok || typeof payload !== "object" || payload === null || !("data" in payload) || !isBenefits(payload.data)) throw new Error("load failed");
      const next = payload.data; setData((current) => current ? { coupons: current.coupons, points: { balance: next.points.balance, entries: [...current.points.entries, ...next.points.entries.filter((entry) => !current.points.entries.some((currentEntry) => currentEntry.id === entry.id))], nextCursor: next.points.nextCursor } } : next);
    } catch (caught) { if (caught instanceof Error) setError("혜택 내역을 불러오지 못했습니다."); } finally { setLoadingMore(false); }
  }
  if (error) return <p role="alert" className="text-red-400">{error}</p>;
  if (!data) return <p className="text-zinc-400">혜택을 불러오는 중...</p>;
  return (
    <div className="space-y-8">
      <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">Pilot 혜택은 기록·조회 전용이며 현재 checkout에서 사용할 수 없습니다.</p>
      <section aria-labelledby="coupon-title"><h2 id="coupon-title" className="mb-4 text-xl font-bold">My Coupons</h2>
        {data.coupons.length === 0 ? <p className="text-zinc-500">발급된 쿠폰이 없습니다.</p> : <div className="grid gap-4 sm:grid-cols-2">{data.coupons.map((coupon) => <article key={coupon.id} className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5"><div className="flex justify-between gap-3"><h3 className="font-bold">{coupon.name}</h3><span className="text-xs text-brand-neon">{coupon.status}</span></div><p className="mt-3 text-lg font-black">{coupon.ratePercent}% · 최소 주문 {coupon.minOrderAed} AED · 최대 {coupon.maxDiscountAed} AED</p><p className="mt-2 text-sm text-zinc-400">{coupon.scope === "ALL_PRODUCTS" ? "전체 상품" : `${coupon.brands.join(", ")} 상품`}</p>{coupon.expiresAt && <p className="mt-2 text-xs text-zinc-500">만료 {new Date(coupon.expiresAt).toLocaleString()}</p>}</article>)}</div>}
      </section>
      <section aria-labelledby="points-title"><h2 id="points-title" className="text-xl font-bold">Points</h2><p className="mt-2 text-4xl font-black text-brand-neon">{data.points.balance.toLocaleString()} P</p><div className="mt-4 divide-y divide-white/10">{data.points.entries.length === 0 ? <p className="py-4 text-zinc-500">포인트 내역이 없습니다.</p> : data.points.entries.map((entry) => <div key={entry.id} className="flex justify-between gap-4 py-3"><div><p>{entry.label}</p><p className="text-xs text-zinc-500">{entry.type}</p></div><strong className={entry.amount >= 0 ? "text-brand-neon" : "text-red-400"}>{entry.amount > 0 ? "+" : ""}{entry.amount} P</strong></div>)}</div>{data.points.nextCursor && <button type="button" disabled={loadingMore} onClick={() => void loadMore()} className="mt-4 rounded-lg border border-white/20 px-4 py-2">{loadingMore ? "불러오는 중..." : "내역 더 보기"}</button>}</section>
    </div>
  );
}
