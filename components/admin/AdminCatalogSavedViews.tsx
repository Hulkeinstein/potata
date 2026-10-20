"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCatalogSavedViews } from "./useCatalogSavedViews";
import { AdminSavedViewDeleteConfirmation } from "./AdminSavedViewDeleteConfirmation";
import type { SavedCatalogView } from "@/lib/admin-catalog-saved-views";

type Props = { readonly storageScope?: string; readonly appliedQuery: string; readonly busy: boolean };
const field = "mt-1 w-full min-w-0 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-40";
const button = "rounded border border-zinc-600 px-3 py-2 text-sm disabled:opacity-40";

export function AdminCatalogSavedViews({ storageScope, appliedQuery, busy }: Props) {
  return <SavedViewsContent key={storageScope ?? "missing"} storageScope={storageScope} appliedQuery={appliedQuery} busy={busy} />;
}

function SavedViewsContent({ storageScope, appliedQuery, busy }: Props) {
  const router = useRouter();
  const { result, save, remove } = useCatalogSavedViews(storageScope);
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [confirmation, setConfirmation] = useState<SavedCatalogView | null>(null);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const views = result.ok ? result.views : [];
  const selected = views.find(({ id }) => id === selectedId);
  const disabled = busy || !storageScope || !result.ok;
  function saveCurrent() {
    if (disabled) return;
    setSuccess("");
    const next = save(name, appliedQuery);
    if (!next.ok) { setMessage(next.error); return; }
    setMessage(""); setSuccess("현재 적용된 조건을 저장했습니다."); setName("");
  }
  function deleteSelected() {
    if (!confirmation || disabled) return;
    setSuccess("");
    const next = remove(confirmation.id);
    setConfirmation(null);
    if (!next.ok) { setMessage(next.error); return; }
    setMessage(""); setSuccess("저장한 보기를 삭제했습니다."); setSelectedId("");
  }
  return <section aria-label="저장한 보기" className="space-y-3 rounded border border-zinc-800 bg-zinc-950 p-4">
    <h2 className="font-bold">저장한 보기</h2>
    <p className="text-xs leading-relaxed text-zinc-400">현재 관리자 계정의 이 브라우저에만 저장되며 다른 기기와 동기화되지 않습니다. 조건 적용을 마친 검색·필터·정렬을 저장하고, 불러올 때 첫 페이지로 이동합니다.</p>
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><label className="min-w-0 text-xs text-zinc-400">보기 이름<input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} disabled={disabled} className={field} placeholder="예: 한국어 설명 없는 상품" /></label><button className={button} disabled={disabled} onClick={saveCurrent}>현재 조건 저장</button></div>
    <div className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-xs text-zinc-400">저장한 보기 선택<select className={field} value={selected?.id ?? ""} disabled={disabled || views.length === 0} onChange={(event) => setSelectedId(event.target.value)}><option value="">보기 선택 ({views.length}/20)</option>{views.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}</select></label><button className={button} disabled={disabled || !selected} onClick={() => { if (selected) router.push(`/admin/products${selected.query ? `?${selected.query}` : ""}`); }}>불러오기</button><button className={button} disabled={disabled || !selected} onClick={() => { if (selected) setConfirmation(selected); }}>보기 삭제</button></div>
    {!storageScope ? <p className="text-xs text-amber-300">관리자 계정을 확인할 수 없어 저장 기능을 사용할 수 없습니다.</p> : null}
    {!result.ok || message ? <p role="alert" className="text-sm text-red-300">{!result.ok ? result.error : message}</p> : null}
    {success ? <p role="status" className="text-sm text-emerald-300">{success}</p> : null}
    {confirmation ? <AdminSavedViewDeleteConfirmation name={confirmation.name} busy={busy} onCancel={() => setConfirmation(null)} onConfirm={deleteSelected} /> : null}
  </section>;
}
