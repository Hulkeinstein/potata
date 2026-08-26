"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminQuestionAnswerComposer } from "@/components/admin/AdminQuestionAnswerComposer";
import { AdminQuestionThumbnail } from "@/components/admin/AdminQuestionThumbnail";
import type { AdminQuestionPage, AdminQuestionStatus } from "@/types/admin-questions";

type AdminQuestionsInboxProps = {
  readonly initialData: AdminQuestionPage;
  readonly initialStatus: AdminQuestionStatus;
  readonly initialQuery: string;
};

const statuses: readonly { readonly value: AdminQuestionStatus; readonly label: string }[] = [
  { value: "unanswered", label: "미답변" },
  { value: "answered", label: "답변 완료" },
  { value: "all", label: "전체" },
];

function isQuestionPage(value: unknown): value is AdminQuestionPage {
  if (value === null || typeof value !== "object" || !("items" in value) || !("total" in value) || !("page" in value) || !("pageSize" in value) || !("hasMore" in value)) return false;
  return Array.isArray(value.items) && typeof value.total === "number" && typeof value.page === "number" && typeof value.pageSize === "number" && typeof value.hasMore === "boolean";
}

function responsePage(value: unknown): AdminQuestionPage | null {
  if (value === null || typeof value !== "object" || !("success" in value) || value.success !== true || !("data" in value)) return null;
  return isQuestionPage(value.data) ? value.data : null;
}

export function AdminQuestionsInbox({ initialData, initialStatus, initialQuery }: AdminQuestionsInboxProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [status, setStatus] = useState(initialStatus);
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function parameters(page: number, nextStatus = status, nextQuery = query): URLSearchParams {
    const values = new URLSearchParams({ status: nextStatus, page: String(page) });
    if (nextQuery.trim()) values.set("q", nextQuery.trim());
    return values;
  }

  async function load(page: number, nextStatus = status, nextQuery = query) {
    setLoading(true);
    setMessage("");
    const params = parameters(page, nextStatus, nextQuery);
    try {
      const response = await fetch(`/api/admin/questions?${params.toString()}`);
      const payload: unknown = await response.json();
      const nextData = responsePage(payload);
      if (!response.ok || !nextData) {
        setMessage("문의 목록을 불러오지 못했습니다. 다시 시도해 주세요.");
        return;
      }
      setData(nextData);
      setStatus(nextStatus);
      setQuery(nextQuery);
      router.replace(`/admin/questions?${params.toString()}`);
    } catch {
      setMessage("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize));
  return <section className="mx-auto max-w-5xl space-y-6">
    <header><h1 className="text-3xl font-black">Q&A Inbox</h1><p className="mt-2 text-sm text-zinc-400">고객 문의를 확인하고 답변을 관리합니다.</p></header>
    <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void load(1); }}><input aria-label="문의 검색" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상품명, 브랜드, 작성자 또는 질문 검색" className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2" /><button disabled={loading} className="rounded bg-white px-4 py-2 font-bold text-black disabled:opacity-40">검색</button></form>
    <div className="flex flex-wrap gap-2" aria-label="답변 상태">{statuses.map((item) => <button key={item.value} type="button" disabled={loading} onClick={() => void load(1, item.value)} aria-pressed={status === item.value} className={status === item.value ? "rounded bg-brand-neon px-3 py-2 text-sm font-bold text-black" : "rounded border border-zinc-700 px-3 py-2 text-sm"}>{item.label}</button>)}</div>
    {message ? <div role="alert" className="flex flex-wrap items-center gap-3 rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-200"><span>{message}</span><button type="button" onClick={() => void load(data.page)} className="underline">다시 시도</button></div> : null}
    <p className="text-sm text-zinc-400">{status === "unanswered" ? "미답변" : status === "answered" ? "답변 완료" : "전체"} {data.total}건</p>
    {loading ? <p role="status" className="text-sm text-zinc-400">문의 목록을 불러오는 중...</p> : null}
    <ul className="space-y-3">{data.items.map((question) => <li key={question.id} className="rounded border border-zinc-800 bg-zinc-950 p-4"><div className="flex gap-3"><AdminQuestionThumbnail imageUrl={question.product.imageUrl} productName={question.product.name} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><Link href={`/product/${question.product.id}`} className="font-bold hover:underline">{question.product.name}</Link><span className="text-sm text-zinc-400">{question.product.brand}</span>{question.product.isActive ? null : <span className="rounded bg-amber-950 px-2 py-0.5 text-xs text-amber-200">판매 중지</span>}<Link href={`/admin/products/${question.product.id}/edit`} className="text-sm underline text-zinc-300 hover:text-white">상품 수정</Link></div><p className="mt-3 text-sm text-zinc-400">{question.customerName ?? "고객"} · {new Date(question.createdAt).toLocaleDateString("ko-KR")}</p><p className="mt-2 whitespace-pre-wrap text-sm text-zinc-100">{question.content}</p><AdminQuestionAnswerComposer question={question} onChanged={() => load(data.page)} /></div></div></li>)}</ul>
    {!loading && data.items.length === 0 ? <div className="rounded border border-zinc-800 py-16 text-center text-zinc-400">조건에 맞는 문의가 없습니다.</div> : null}
    <nav aria-label="Q&A 페이지" className="flex items-center justify-center gap-3"><button type="button" disabled={loading || data.page <= 1} onClick={() => void load(data.page - 1)} className="rounded border border-zinc-700 px-3 py-2 text-sm disabled:opacity-40">이전</button><span className="text-sm text-zinc-400">{data.page} / {pageCount}</span><button type="button" disabled={loading || !data.hasMore} onClick={() => void load(data.page + 1)} className="rounded border border-zinc-700 px-3 py-2 text-sm disabled:opacity-40">다음</button></nav>
  </section>;
}
