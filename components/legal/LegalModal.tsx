"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { LEGAL_DOCUMENTS, LEGAL_DRAFT_NOTICE, LEGAL_PENDING_NOTICE, LEGAL_VERSION, type LegalDocumentKey } from "@/lib/legal-documents";

export function LegalModal({ documentKey, onClose, returnFocus }: { readonly documentKey: LegalDocumentKey; readonly onClose: () => void; readonly returnFocus: HTMLElement | null }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const document = LEGAL_DOCUMENTS[documentKey];
  useEffect(() => {
    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])');
    focusable?.[0]?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && globalThis.document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && globalThis.document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    globalThis.document.addEventListener("keydown", keydown);
    return () => { globalThis.document.removeEventListener("keydown", keydown); returnFocus?.focus(); };
  }, [onClose, returnFocus]);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={panelRef} role="dialog" aria-modal="true" aria-label={document.title} className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950 p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-brand-neon">Version {LEGAL_VERSION}</p><h2 className="mt-2 text-2xl font-black text-white">{document.title}</h2></div><button type="button" onClick={onClose} aria-label="약관 닫기" className="grid size-10 shrink-0 place-items-center rounded-full border border-white/15 text-xl text-zinc-300 hover:bg-white/10">×</button></div><p className="mt-5 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-200">{LEGAL_DRAFT_NOTICE}</p><div className="mt-6 space-y-4 text-sm leading-7 text-zinc-300">{document.sections.map((section) => <p key={section}>{section}</p>)}</div><p className="mt-6 text-xs leading-6 text-zinc-500">{LEGAL_PENDING_NOTICE}</p><div className="mt-7 flex items-center justify-between gap-4 border-t border-white/10 pt-5"><Link href={document.href} target="_blank" className="text-sm text-zinc-400 underline">전체 페이지로 보기</Link><button type="button" onClick={onClose} className="rounded-xl bg-brand-neon px-5 py-2.5 font-bold text-black">확인</button></div></div></div>;
}
