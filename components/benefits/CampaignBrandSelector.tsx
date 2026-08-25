"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  readonly brands: readonly string[];
  readonly selected: readonly string[];
  readonly onChange: (brands: readonly string[]) => void;
};

export function CampaignBrandSelector({ brands, selected, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => { const timer = window.setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 150); return () => window.clearTimeout(timer); }, [query]);
  const matching = useMemo(() => brands.filter((brand) => brand.toLowerCase().includes(debouncedQuery)), [brands, debouncedQuery]);
  const selectedSet = new Set(selected);
  function toggle(brand: string) { onChange(selectedSet.has(brand) ? selected.filter((item) => item !== brand) : [...selected, brand]); }
  function selectAllMatching() { onChange([...new Set([...selected, ...matching])]); }
  function clear() { onChange([]); }
  return <fieldset className="rounded-lg border border-white/10 p-3 sm:col-span-2">
    <legend className="px-1 text-sm text-zinc-300">적용 브랜드</legend>
    <p className="mb-2 text-xs text-zinc-400">브랜드 범위를 선택할 때만 사용합니다. {selected.length}개 선택됨</p>
    {selected.map((brand) => <input key={brand} type="hidden" name="brands" value={brand}/>) }
    <label className="sr-only" htmlFor="campaign-brand-search">브랜드 검색</label>
    <input id="campaign-brand-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="브랜드 검색" className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-white"/>
    <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={selectAllMatching} className="text-xs underline">검색 결과 모두 선택</button><button type="button" onClick={clear} className="text-xs underline">선택 지우기</button></div>
    <div className="mt-3 max-h-48 overflow-y-auto" role="group" aria-label="검색된 브랜드">
      {matching.map((brand) => <label key={brand} className="flex cursor-pointer items-center gap-2 py-1 text-sm"><input type="checkbox" checked={selectedSet.has(brand)} onChange={() => toggle(brand)}/>{brand}</label>)}
      {matching.length === 0 && <p className="text-sm text-zinc-500">일치하는 브랜드가 없습니다.</p>}
    </div>
    {selected.length > 0 && <div className="mt-3 flex flex-wrap gap-2" aria-label="선택한 브랜드">{selected.map((brand) => <button key={brand} type="button" onClick={() => toggle(brand)} className="rounded-full bg-white/10 px-2 py-1 text-xs">{brand} ×</button>)}</div>}
  </fieldset>;
}
