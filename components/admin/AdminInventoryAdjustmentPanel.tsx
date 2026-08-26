"use client";

import { useState } from "react";
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

type AdjustmentPayload = { readonly success: boolean; readonly data?: { readonly items: readonly AdjustmentItem[]; readonly nextCursor?: string | null }; readonly error?: string };

const TYPES = ["RECEIVE", "CORRECTION", "DISPOSAL"] as const;
type AdjustmentType = (typeof TYPES)[number];

const TYPE_LABELS = { RECEIVE: "입고", CORRECTION: "정정", DISPOSAL: "폐기" } as const;
const SAFE_SERVER_MESSAGES = new Set([
  "조정 수량은 0이 아니어야 합니다.",
  "조정 사유가 필요합니다.",
  "입고는 양수 수량이어야 합니다.",
  "폐기는 음수 수량이어야 합니다.",
  "상품 옵션을 찾을 수 없습니다.",
  "재고가 부족합니다.",
  "재고 조정 충돌입니다. 다시 시도해 주세요.",
  "멱등 키 충돌입니다.",
]);

function optionLabel(variant: InventoryVariant): string {
  return [variant.color, variant.size].filter(Boolean).join(" / ") || "기본 옵션";
}

function isAdjustmentPayload(value: unknown): value is AdjustmentPayload {
  return value !== null && typeof value === "object" && "success" in value && typeof value.success === "boolean";
}

function displayDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}

function adjustmentTypeFromValue(value: string): AdjustmentType {
  switch (value) {
    case "RECEIVE": return "RECEIVE";
    case "CORRECTION": return "CORRECTION";
    case "DISPOSAL": return "DISPOSAL";
    default: return "RECEIVE";
  }
}

function formatTimestamp(createdAt: string): string {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? "시간 정보 없음" : new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function serverMessage(payload: unknown): string {
  return isAdjustmentPayload(payload) && typeof payload.error === "string" && SAFE_SERVER_MESSAGES.has(payload.error)
    ? payload.error
    : "재고를 조정하지 못했습니다. 사유와 수량을 확인해 주세요.";
}

export function AdminInventoryAdjustmentPanel({ variant }: { readonly variant: InventoryVariant }) {
  const router = useRouter();
  const [type, setType] = useState<AdjustmentType>("RECEIVE");
  const [delta, setDelta] = useState("1");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<readonly AdjustmentItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadHistory(cursor?: string): Promise<void> {
    setHistoryLoading(true);
    const params = new URLSearchParams({ variantId: variant.id });
    if (cursor) params.set("cursor", cursor);
    try {
      const response = await fetch(`/api/admin/inventory-adjustments?${params.toString()}`);
      const payload: unknown = await response.json();
      if (!response.ok || !isAdjustmentPayload(payload) || !payload.success) {
        setMessage("조정 이력을 불러오지 못했습니다. 다시 시도해 주세요.");
        return;
      }
      const history = payload.data?.items ?? [];
      setItems((previous) => cursor ? [...previous, ...history.filter((item) => !previous.some((existing) => existing.id === item.id))] : history);
      setNextCursor(payload.data?.nextCursor ?? null);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setMessage("조정 이력을 불러오지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setHistoryLoading(false);
    }
  }

  function changeType(nextType: AdjustmentType): void {
    setType(nextType);
    setDelta(nextType === "DISPOSAL" ? "-1" : "1");
    setMessage("");
  }

  function openHistory(): void {
    setHistoryOpen(true);
    if (items.length === 0) void loadHistory();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericDelta = Number.parseInt(delta, 10);
    if (!Number.isInteger(numericDelta) || numericDelta === 0) { setMessage("0이 아닌 조정 수량을 입력해 주세요."); return; }
    if ((type === "RECEIVE" && numericDelta < 0) || (type === "DISPOSAL" && numericDelta > 0)) { setMessage(type === "RECEIVE" ? "입고는 양수 수량이어야 합니다." : "폐기는 음수 수량이어야 합니다."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/inventory-adjustments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variantId: variant.id, type, delta: numericDelta, reason, idempotencyKey: crypto.randomUUID() }) });
      const payload: unknown = await response.json();
      if (!response.ok) {
        setMessage(serverMessage(payload));
        return;
      }
      setReason("");
      setDelta(type === "DISPOSAL" ? "-1" : "1");
      setMessage("재고 조정이 기록되었습니다.");
      router.refresh();
      if (historyOpen) await loadHistory();
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setMessage("재고를 조정하지 못했습니다. 사유와 수량을 확인해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="space-y-3 rounded bg-zinc-900 p-3" aria-label={`${optionLabel(variant)} 재고 조정`}>
    <div className="flex flex-wrap items-center gap-3"><span className="min-w-24 text-sm">{optionLabel(variant)}</span><span className="text-sm text-zinc-300">현재 재고 {variant.stock}</span><span className={variant.isManuallySoldOut ? "text-xs text-amber-400" : "text-xs text-zinc-400"}>{variant.isManuallySoldOut ? "수동 품절" : variant.stock === 0 ? "품절" : variant.stock <= 3 ? "저재고" : "정상"}</span></div>
    <form onSubmit={(event) => void submit(event)} className="flex flex-wrap items-end gap-2">
      <label className="text-xs">유형<select value={type} onChange={(event) => changeType(adjustmentTypeFromValue(event.target.value))} className="mt-1 block rounded bg-black p-2">{TYPES.map((value) => <option key={value} value={value}>{TYPE_LABELS[value]}</option>)}</select></label>
      <label className="text-xs">조정 수량<input aria-label={`${variant.id} 조정 수량`} type="number" required value={delta} onChange={(event) => setDelta(event.target.value)} className="mt-1 block w-24 rounded bg-black p-2" /></label>
      <label className="min-w-48 flex-1 text-xs">사유<input aria-label={`${variant.id} 조정 사유`} required maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 block w-full rounded bg-black p-2" /></label>
      <button disabled={saving} className="rounded border border-zinc-600 px-3 py-2 text-sm disabled:opacity-40">{saving ? "기록 중" : "조정 기록"}</button>
    </form>
    {message ? <p role="alert" className="text-xs text-zinc-300">{message}</p> : null}
    <div className="border-t border-zinc-800 pt-2">
      {historyOpen ? <button type="button" onClick={() => setHistoryOpen(false)} className="text-xs text-zinc-300 underline">이력 숨기기</button> : <button type="button" onClick={openHistory} className="text-xs text-zinc-300 underline">이력 보기</button>}
      {historyOpen ? <div className="mt-2 space-y-2">{historyLoading && items.length === 0 ? <p className="text-xs text-zinc-500">조정 이력을 불러오는 중입니다.</p> : null}{!historyLoading && items.length === 0 ? <p className="text-xs text-zinc-500">관리자 조정 이력이 없습니다.</p> : null}{items.length > 0 ? <ul className="space-y-1 text-xs text-zinc-400">{items.map((item) => <li key={item.id}>{formatTimestamp(item.createdAt)} · {item.actor.name} · {TYPE_LABELS[item.type]} {displayDelta(item.delta)} · {item.stockBefore} → {item.stockAfter} · {item.reason}</li>)}</ul> : null}{nextCursor ? <button type="button" disabled={historyLoading} onClick={() => void loadHistory(nextCursor)} className="text-xs text-zinc-300 underline disabled:opacity-40">{historyLoading ? "불러오는 중" : "더 보기"}</button> : null}</div> : null}
    </div>
  </section>;
}
