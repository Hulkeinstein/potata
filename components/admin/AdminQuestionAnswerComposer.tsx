"use client";

import { useState } from "react";
import type { AdminQuestionAnswer, AdminQuestionItem } from "@/types/admin-questions";

type AdminQuestionAnswerComposerProps = {
  readonly question: AdminQuestionItem;
  readonly onChanged: () => Promise<void>;
};

function responseSucceeded(value: unknown): boolean {
  return value !== null && typeof value === "object" && "success" in value && value.success === true;
}

type AnswerEditorProps = {
  readonly label: string;
  readonly initialContent: string;
  readonly submitLabel: string;
  readonly onSubmit: (content: string) => Promise<Response>;
  readonly onSuccess: () => Promise<void>;
  readonly onCancel: () => void;
};

function AnswerEditor({ label, initialContent, submitLabel, onSubmit, onSuccess, onCancel }: AnswerEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      setError("답변 내용을 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await onSubmit(trimmed);
      const payload: unknown = await response.json();
      if (!response.ok || !responseSucceeded(payload)) {
        setError("답변을 저장하지 못했습니다. 다시 시도해 주세요.");
        return;
      }
      await onSuccess();
      onCancel();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return <form className="mt-3 space-y-2" onSubmit={(event) => void submit(event)}>
    <textarea aria-label={label} value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} rows={4} className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="답변을 입력해 주세요." />
    {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
    <div className="flex gap-2"><button disabled={submitting} className="rounded bg-brand-neon px-3 py-2 text-sm font-bold text-black disabled:opacity-40">{submitting ? "저장 중..." : submitLabel}</button><button type="button" disabled={submitting} onClick={onCancel} className="rounded border border-zinc-600 px-3 py-2 text-sm disabled:opacity-40">취소</button></div>
  </form>;
}

function answerPath(question: AdminQuestionItem, answer?: AdminQuestionAnswer): string {
  const base = `/api/products/${question.product.id}/questions/${question.id}/answers`;
  return answer ? `${base}/${answer.id}` : base;
}

export function AdminQuestionAnswerComposer({ question, onChanged }: AdminQuestionAnswerComposerProps) {
  const [mode, setMode] = useState<"create" | string | null>(null);

  if (mode === "create") {
    return <AnswerEditor label={`${question.product.name} 답변`} initialContent="" submitLabel="답변 등록" onCancel={() => setMode(null)} onSuccess={onChanged} onSubmit={(content) => fetch(answerPath(question), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) })} />;
  }

  const editingAnswer = question.answers.find((answer) => answer.id === mode);
  if (editingAnswer) {
    return <AnswerEditor label={`${question.product.name} 답변 수정`} initialContent={editingAnswer.content} submitLabel="수정 완료" onCancel={() => setMode(null)} onSuccess={onChanged} onSubmit={(content) => fetch(answerPath(question, editingAnswer), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) })} />;
  }

  return <div className="mt-3 space-y-3">
    {question.answers.length > 0 ? <ul className="space-y-2 border-l-2 border-brand-neon/30 pl-3">{question.answers.map((answer) => <li key={answer.id} className="rounded bg-zinc-900 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold">{answer.authorName ?? "관리자"}</p><button type="button" onClick={() => setMode(answer.id)} className="text-sm text-zinc-300 underline hover:text-white">수정</button></div><p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{answer.content}</p></li>)}</ul> : null}
    <button type="button" onClick={() => setMode("create")} className="rounded border border-zinc-600 px-3 py-2 text-sm hover:border-white">답변하기</button>
  </div>;
}
