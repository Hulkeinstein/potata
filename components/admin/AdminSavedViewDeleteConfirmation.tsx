"use client";

import { useEffect, useRef } from "react";

export function AdminSavedViewDeleteConfirmation({ name, busy, onCancel, onConfirm }: { readonly name: string; readonly busy: boolean; readonly onCancel: () => void; readonly onConfirm: () => void }) {
  const cancel = useRef<HTMLButtonElement>(null);
  const confirm = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    cancel.current?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="saved-view-delete-title" className="w-full max-w-md rounded-lg border border-zinc-600 bg-zinc-950 p-5" onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); onCancel(); }
      if (event.key === "Tab" && busy) { event.preventDefault(); cancel.current?.focus(); return; }
      if (event.key === "Tab" && event.shiftKey && document.activeElement === cancel.current) { event.preventDefault(); confirm.current?.focus(); }
      if (event.key === "Tab" && !event.shiftKey && document.activeElement === confirm.current) { event.preventDefault(); cancel.current?.focus(); }
    }}>
      <h2 id="saved-view-delete-title" className="break-words text-lg font-bold">‘{name}’ 보기를 삭제할까요?</h2>
      <p className="mt-3 text-sm text-zinc-400">저장한 조건만 삭제합니다. 상품 데이터는 바뀌지 않습니다.</p>
      <div className="mt-5 flex justify-end gap-3"><button ref={cancel} className="rounded border border-zinc-600 px-4 py-2" onClick={onCancel}>취소</button><button ref={confirm} disabled={busy} className="rounded bg-brand-neon px-4 py-2 font-bold text-black disabled:opacity-40" onClick={onConfirm}>삭제 실행</button></div>
    </div>
  </div>;
}
