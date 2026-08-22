"use client";

import Image from "next/image";
import Link from "next/link";
import { Pencil, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import type { MyPostItem } from "@/types";

type ProductPost = Exclude<MyPostItem, { readonly type: "ootd" }>;

export function ProductPostCard({ item, onChange, onDelete }: { readonly item: ProductPost; readonly onChange: (item: ProductPost) => void; readonly onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.type === "review" ? item.comment : item.content);
  const [rating, setRating] = useState(item.type === "review" ? item.rating : 0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setPending(true); setError(null);
    try {
      const request = item.type === "review" ? reviewRequest(item, rating, text) : questionRequest(item, text);
      const response = await fetch(request.url, request.init);
      const json = (await response.json()) as { readonly success: boolean; readonly data?: { readonly rating?: number; readonly comment?: string | null; readonly content?: string; readonly updatedAt?: string }; readonly error?: string };
      if (!response.ok || !json.success) { setError(json.error ?? "수정하지 못했어요."); return; }
      if (item.type === "review") {
        onChange({ ...item, rating: json.data?.rating ?? rating, comment: json.data?.comment ?? "", updatedAt: json.data?.updatedAt ?? item.updatedAt });
      } else {
        onChange({ ...item, content: json.data?.content ?? text.trim(), updatedAt: json.data?.updatedAt ?? item.updatedAt });
      }
      setEditing(false);
    } catch { setError("네트워크 오류가 발생했어요."); } finally { setPending(false); }
  };

  const remove = async () => {
    if (!window.confirm(item.type === "review" ? "이 리뷰를 삭제할까요?" : "이 Q&A를 삭제할까요?")) return;
    setPending(true); setError(null);
    const url = item.type === "review" ? `/api/products/${item.productId}/reviews` : `/api/products/${item.productId}/questions/${item.id}`;
    try {
      const response = await fetch(url, { method: "DELETE" });
      if (!response.ok) { setError("삭제하지 못했어요."); return; }
      onDelete(item.id);
    } catch { setError("네트워크 오류가 발생했어요."); } finally { setPending(false); }
  };
  const cancel = () => {
    setText(item.type === "review" ? item.comment : item.content);
    setRating(item.type === "review" ? item.rating : 0);
    setError(null);
    setEditing(false);
  };

  return <article className="rounded-xl border border-white/5 bg-zinc-900/30 p-4">
    <div className="flex gap-4">
      <Link href={`/product/${item.productId}`} className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-800" aria-label={`${item.productName} 상품 보기`}>
        {item.productImageUrl && <Image src={item.productImageUrl} alt="" fill className="object-cover" sizes="64px" />}
      </Link>
      <div className="min-w-0 flex-1"><Link href={`/product/${item.productId}`} className="font-semibold text-zinc-200 hover:text-brand-neon">{item.productName}</Link>
        {item.type === "review" ? <div className="mt-1 flex items-center gap-1 text-xs text-amber-300"><Star className="h-3.5 w-3.5 fill-current" />{item.rating}/5</div> : <p className="mt-1 text-xs text-zinc-500">답변 {item.answerCount}개</p>}
        {!editing && <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">{item.type === "review" ? item.comment || "리뷰 내용 없음" : item.content}</p>}
      </div>
    </div>
    {editing && <div className="mt-4 space-y-3">{item.type === "review" && <label className="block text-xs text-zinc-400">별점<select aria-label="리뷰 별점" value={rating} onChange={(event) => setRating(Number(event.target.value))} className="ml-2 min-h-11 rounded-lg bg-zinc-800 px-3 text-white">{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>}<label className="sr-only" htmlFor={`post-text-${item.id}`}>{item.type === "review" ? "리뷰 내용" : "Q&A 내용"}</label><textarea id={`post-text-${item.id}`} value={text} maxLength={2000} onChange={(event) => setText(event.target.value)} className="w-full rounded-lg border border-white/10 bg-zinc-800 p-3 text-sm" rows={3} /><div className="flex gap-2"><button type="button" disabled={pending} onClick={() => void save()} className="min-h-11 flex-1 rounded-lg bg-brand-neon text-sm font-semibold text-black">저장</button><button type="button" disabled={pending} onClick={cancel} className="min-h-11 flex-1 rounded-lg border border-white/10 text-sm">취소</button></div></div>}
    {!editing && <div className="mt-4 flex border-t border-white/5 pt-2"><button type="button" disabled={pending} onClick={() => setEditing(true)} className="flex min-h-11 flex-1 items-center justify-center gap-1 text-xs text-zinc-300"><Pencil className="h-3.5 w-3.5" />수정</button><button type="button" aria-label={`${item.type === "review" ? "리뷰" : "Q&A"} 삭제`} disabled={pending} onClick={() => void remove()} className="flex min-h-11 flex-1 items-center justify-center gap-1 text-xs text-red-400"><Trash2 className="h-3.5 w-3.5" />삭제</button></div>}
    {error && <p role="alert" className="mt-2 text-xs text-red-400">{error}</p>}
  </article>;
}

function reviewRequest(item: Extract<ProductPost, { readonly type: "review" }>, rating: number, comment: string) {
  const body = new FormData();
  body.append("rating", String(rating)); body.append("comment", comment);
  item.imageUrls.forEach((url) => body.append("keepImageUrls", url));
  return { url: `/api/products/${item.productId}/reviews`, init: { method: "POST", body } };
}

function questionRequest(item: Extract<ProductPost, { readonly type: "question" }>, content: string) {
  return { url: `/api/products/${item.productId}/questions/${item.id}`, init: { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) } };
}
