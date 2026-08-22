"use client";

import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type { MyPostItem } from "@/types";

type MyOOTDPost = Extract<MyPostItem, { readonly type: "ootd" }>;

export function OOTDPostCard({ item, onChange, onDelete }: { readonly item: MyOOTDPost; readonly onChange: (item: MyOOTDPost) => void; readonly onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(item.caption ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setPending(true); setError(null);
    try {
      const response = await fetch(`/api/ootd/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caption }) });
      const json = (await response.json()) as { readonly success: boolean; readonly data?: { readonly caption: string | null }; readonly error?: string };
      if (!response.ok || !json.success || !json.data) { setError(json.error ?? "수정하지 못했어요."); return; }
      onChange({ ...item, caption: json.data.caption }); setEditing(false);
    } catch { setError("네트워크 오류가 발생했어요."); } finally { setPending(false); }
  };
  const remove = async () => {
    if (!window.confirm("이 OOTD를 삭제할까요?")) return;
    setPending(true); setError(null);
    try {
      const response = await fetch(`/api/ootd/${item.id}`, { method: "DELETE" });
      if (!response.ok) { setError("삭제하지 못했어요."); return; }
      onDelete(item.id);
    } catch { setError("네트워크 오류가 발생했어요."); } finally { setPending(false); }
  };
  const cancel = () => { setCaption(item.caption ?? ""); setError(null); setEditing(false); };
  const image = item.imageUrls[0];

  return <article className="overflow-hidden rounded-xl border border-white/5 bg-zinc-900/30">
    <div className="relative aspect-square bg-zinc-900">{image && <Image src={image} alt={item.caption || "내 OOTD"} fill className="object-cover" sizes="(max-width: 640px) 50vw, 220px" />}</div>
    <div className="p-3">{editing ? <div className="space-y-2"><label className="sr-only" htmlFor={`caption-${item.id}`}>OOTD 설명</label><textarea id={`caption-${item.id}`} value={caption} maxLength={2000} onChange={(event) => setCaption(event.target.value)} className="w-full rounded-lg border border-white/10 bg-zinc-800 p-2 text-sm" /><div className="flex gap-2"><button type="button" disabled={pending} onClick={() => void save()} className="min-h-11 flex-1 rounded-lg bg-brand-neon text-sm font-semibold text-black">저장</button><button type="button" disabled={pending} onClick={cancel} className="min-h-11 flex-1 rounded-lg border border-white/10 text-sm">취소</button></div></div> : <p className="line-clamp-2 min-h-10 text-sm text-zinc-300">{item.caption || "설명 없음"}</p>}
      <p className="mt-2 text-xs text-zinc-500">좋아요 {item.likeCount} · 댓글 {item.commentCount}</p>
      {!editing && <div className="mt-2 flex border-t border-white/5 pt-2"><button type="button" disabled={pending} onClick={() => setEditing(true)} className="flex min-h-11 flex-1 items-center justify-center gap-1 text-xs text-zinc-300"><Pencil className="h-3.5 w-3.5" />수정</button><button type="button" aria-label="OOTD 삭제" disabled={pending} onClick={() => void remove()} className="flex min-h-11 flex-1 items-center justify-center gap-1 text-xs text-red-400"><Trash2 className="h-3.5 w-3.5" />삭제</button></div>}
      {error && <p role="alert" className="mt-2 text-xs text-red-400">{error}</p>}</div>
  </article>;
}
