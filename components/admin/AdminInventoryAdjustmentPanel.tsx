"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type InventoryVariant = {
  readonly id: string;
  readonly size: string;
  readonly color: string;
  readonly stock: number;
  readonly isManuallySoldOut: boolean;
};

type AdjustmentItem = {
  readonly id: string;
  readonly type: "RECEIVE" | "CORRECTION" | "DISPOSAL";
  readonly delta: number;
  readonly stockBefore: number;
  readonly stockAfter: number;
  readonly reason: string;
  readonly createdAt: string;
  readonly actor: { readonly name: string };
};

type AdjustmentPayload = { readonly success: boolean; readonly data?: { readonly items: readonly AdjustmentItem[] } };

const TYPES = ["RECEIVE", "CORRECTION", "DISPOSAL"] as const;
type AdjustmentType = (typeof TYPES)[number];

function optionLabel(variant: InventoryVariant): string {
  return [variant.color, variant.size].filter(Boolean).join(" / ") || "기본 옵션";
}

export function AdminInventoryAdjustmentPanel({ variant, onAdjusted }: { readonly variant: InventoryVariant; readonly onAdjusted: () => void }) {
  const router = useRouter();
  const [type, setType] = useState<AdjustmentType>("RECEIVE");
  const [delta, setDelta] = useState("1");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<readonly AdjustmentItem[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadHistory() {
    const response = await fetch(`/api/admin/inventory-adjustments?variantId=${encodeURIComponent(variant.id)}`);
    const payload: unknown = await response.json();
    if (!response.ok || !payload || typeof payload !== "object" || !("success" in payload) || !(payload as AdjustmentPayload).success) return;
    setItems((payload as AdjustmentPayload).data?.items ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/admin/inventory-adjustments?variantId=${encodeURIComponent(variant.id)}`)
      .then(async (response) => ({ response, payload: await response.json() as unknown }))
      .then(({ response, payload }) => {
        if (!response.ok || !payload || typeof payload !== "object" || !("success" in payload) || !(payload as AdjustmentPayload).success || cancelled) return;
        setItems((payload as AdjustmentPayload).data?.items ?? []);
      });
    return () => { cancelled = true; };
  }, [variant.id]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericDelta = Number.parseInt(delta, 10);
    if (!Number.isInteger(numericDelta) || numericDelta === 0) { setMessage("0이 아닌 조정 수량을 입력해 주세요."); return; }
    if ((type === "RECEIVE" && numericDelta < 0) || (type === "DISPOSAL" && numericDelta > 0)) { setMessage(type === "RECEIVE" ? "입고는 양수 수량이어야 합니다." : "폐기는 음수 수량이어야 합니다."); return; }
    setSaving(true);
    const response = await fetch("/api/admin/inventory-adjustments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variantId: variant.id, type, delta: numericDelta, reason, idempotencyKey: crypto.randomUUID() }) });
    if (!response.ok) setMessage("재고를 조정하지 못했습니다. 사유와 수량을 확인해 주세요.");
    else { setReason(""); setDelta(type === "DISPOSAL" ? "-1" : "1"); setMessage("재고 조정이 기록되었습니다."); router.refresh(); onAdjusted(); await loadHistory(); }
    setSaving(false);
  }

  return <section className="space-y-3 rounded bg-zinc-900 p-3" aria-label={`${optionLabel(variant)} 재고 조정`}>
    <div className="flex flex-wrap items-center gap-3"><span className="min-w-24 text-sm">{optionLabel(variant)}</span><span className="text-sm text-zinc-300">현재 재고 {variant.stock}</span><span className={variant.isManuallySoldOut ? "text-xs text-amber-400" : "text-xs text-zinc-400"}>{variant.isManuallySoldOut ? "수동 품절" : variant.stock === 0 ? "품절" : variant.stock <= 3 ? "저재고" : "정상"}</span></div>
    <form onSubmit={(event) => void submit(event)} className="flex flex-wrap items-end gap-2">
      <label className="text-xs">유형<select value={type} onChange={(event) => setType(event.target.value as AdjustmentType)} className="mt-1 block rounded bg-black p-2">{TYPES.map((value) => <option key={value} value={value}>{value === "RECEIVE" ? "입고" : value === "CORRECTION" ? "정정" : "폐기"}</option>)}</select></label>
      <label className="text-xs">조정 수량<input aria-label={`${variant.id} 조정 수량`} type="number" required value={delta} onChange={(event) => setDelta(event.target.value)} className="mt-1 block w-24 rounded bg-black p-2" /></label>
      <label className="min-w-48 flex-1 text-xs">사유<input aria-label={`${variant.id} 조정 사유`} required maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 block w-full rounded bg-black p-2" /></label>
      <button disabled={saving} className="rounded border border-zinc-600 px-3 py-2 text-sm disabled:opacity-40">{saving ? "기록 중" : "조정 기록"}</button>
    </form>
    {message ? <p role="alert" className="text-xs text-zinc-300">{message}</p> : null}
    {items.length > 0 ? <ul className="space-y-1 border-t border-zinc-800 pt-2 text-xs text-zinc-400">{items.map((item) => <li key={item.id}>{item.actor.name} · {item.type} {item.delta > 0 ? `+${item.delta}` : item.delta} · {item.stockBefore} → {item.stockAfter} · {item.reason}</li>)}</ul> : <p className="text-xs text-zinc-500">관리자 조정 이력이 없습니다.</p>}
  </section>;
}
