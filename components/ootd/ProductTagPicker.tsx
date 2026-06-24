"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Search, Check, X } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import type { ApiResponse, Order, OrderItemSnapshot, Product } from "@/types";

const MAX_TAGS = 5;
const MAX_RECENTS = 8;

/**
 * OOTD 게시물 상품 태그 피커 — 검색 + 최근 구매 + 썸네일 그리드 + 선택 칩.
 * 현업 패턴(Instagram/LTK): 검색바 + "최근 구매" 기본 섹션 + 썸네일 다중선택 + 상단 칩.
 * 소형 카탈로그라 클라이언트 즉시 필터(새 검색 API 불필요). 최근 구매는 주문내역 API.
 */
export function ProductTagPicker({
  products,
  selected,
  onChange,
}: {
  products: Product[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>([]);

  // 최근 구매 상품 ID(주문내역 최신순) — fetch 후 setState(동기 아님)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/orders");
        if (!res.ok) return;
        const json = (await res.json()) as ApiResponse<Order[]>;
        if (!active || !json.success || !json.data) return;
        const ids: string[] = [];
        for (const order of json.data) {
          const items = (order.items ?? []) as OrderItemSnapshot[];
          for (const it of items) {
            if (it.productId && !ids.includes(it.productId)) ids.push(it.productId);
          }
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRecentIds(ids.slice(0, MAX_RECENTS));
      } catch {
        // 주문내역 조회 실패 — 최근 구매 섹션만 비움(조용히)
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const selectedProducts = selected
    .map((id) => byId.get(id))
    .filter((p): p is Product => Boolean(p));

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      if (selected.length >= MAX_TAGS) {
        alert(`상품은 최대 ${MAX_TAGS}개까지 태그할 수 있어요.`);
        return;
      }
      onChange([...selected, id]);
    }
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? products.filter((p) => `${p.brand} ${p.name}`.toLowerCase().includes(q))
    : null;

  const recentSet = new Set(recentIds);
  const recentProducts = recentIds
    .map((id) => byId.get(id))
    .filter((p): p is Product => Boolean(p));
  const otherProducts = products.filter((p) => !recentSet.has(p.id));

  return (
    <div>
      {/* 선택 칩 */}
      {selectedProducts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
          {selectedProducts.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-1.5 bg-purple-500/20 border border-purple-500/50 rounded-full pl-1 pr-2 py-1 shrink-0"
            >
              <div className="relative w-5 h-5 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
              </div>
              <span className="text-[11px] text-white max-w-24 truncate">{p.name}</span>
              <button
                type="button"
                onClick={() => toggle(p.id)}
                aria-label={`${p.name} 선택 해제`}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 검색 */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="상품 검색 (브랜드·이름)"
          className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* 결과 */}
      <div className="max-h-64 overflow-y-auto">
        {filtered ? (
          filtered.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">
              검색 결과가 없어요. 다른 상품명이나 브랜드로 검색해보세요.
            </p>
          ) : (
            <ProductGrid products={filtered} selected={selected} onToggle={toggle} />
          )
        ) : (
          <>
            {recentProducts.length > 0 && (
              <>
                <p className="text-xs text-zinc-400 font-medium mb-2">최근 구매한 상품</p>
                <ProductGrid products={recentProducts} selected={selected} onToggle={toggle} />
                <p className="text-xs text-zinc-400 font-medium mb-2 mt-4">전체 상품</p>
              </>
            )}
            <ProductGrid
              products={recentProducts.length > 0 ? otherProducts : products}
              selected={selected}
              onToggle={toggle}
            />
          </>
        )}
      </div>
    </div>
  );
}

function ProductGrid({
  products,
  selected,
  onToggle,
}: {
  products: Product[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {products.map((p) => {
        const isSel = selected.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onToggle(p.id)}
            aria-pressed={isSel}
            className={cn(
              "relative text-left rounded-lg overflow-hidden border transition-colors",
              isSel ? "border-purple-500" : "border-white/10 hover:border-white/30"
            )}
          >
            <div className="relative aspect-square bg-zinc-800">
              <Image
                src={p.imageUrl}
                alt={p.name}
                fill
                sizes="(max-width: 768px) 45vw, 200px"
                className="object-cover"
              />
              {isSel && (
                <div className="absolute inset-0 bg-purple-500/30 flex items-center justify-center">
                  <span className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </span>
                </div>
              )}
            </div>
            <div className="p-1.5">
              <p className="text-[11px] text-white truncate">{p.name}</p>
              <p className="text-[10px] text-brand-neon">{formatPrice(p.price)}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
