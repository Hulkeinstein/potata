"use client";

import { useEffect, useRef } from "react";

type Props = {
  readonly items: readonly { readonly id: string; readonly name: string; readonly isActive: boolean }[];
  readonly isActive: boolean;
  readonly busy: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
};

export function AdminProductStatusConfirmation({ items, isActive, busy, onCancel, onConfirm }: Props) {
  const dialog = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const action = isActive ? "재노출" : "판매 중지";
  useEffect(() => {
    const previous = document.activeElement;
    cancel.current?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="bulk-status-title" aria-describedby="bulk-status-description" tabIndex={-1}
      className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-lg border border-zinc-600 bg-zinc-950 p-5 shadow-2xl"
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); if (!busy) onCancel(); }
        if (event.key !== "Tab") return;
        const controls = dialog.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        const first = controls?.item(0);
        const last = controls?.item((controls?.length ?? 0) - 1);
        if (!first || !last) { event.preventDefault(); dialog.current?.focus(); return; }
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
      <h2 id="bulk-status-title" className="text-xl font-bold">선택 상품 {items.length}개 {action} 확인</h2>
      <p id="bulk-status-description" className="mt-3 text-sm leading-relaxed text-zinc-300">재고·수동 품절·가격·설명은 변경하지 않습니다. 재노출해도 재고가 0이거나 수동 품절인 옵션은 구매할 수 없습니다.</p>
      <ul className="my-4 max-h-52 space-y-2 overflow-y-auto rounded border border-zinc-800 p-3 text-sm">{items.map((item) => <li key={item.id} className="break-words">{item.name}<span className="ml-2 text-xs text-zinc-500">현재 {item.isActive ? "노출" : "판매 중지"}</span></li>)}</ul>
      <p className="text-xs text-zinc-400">다른 관리자가 동시에 수정하면 마지막으로 저장된 상태가 적용됩니다.</p>
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button ref={cancel} disabled={busy} className="rounded border border-zinc-600 px-4 py-2 disabled:opacity-40" onClick={onCancel}>취소</button>
        <button disabled={busy} className="rounded bg-brand-neon px-4 py-2 font-bold text-black disabled:opacity-40" onClick={onConfirm}>{busy ? "처리 중…" : `${action} 실행`}</button>
      </div>
    </div>
  </div>;
}
