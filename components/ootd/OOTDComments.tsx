"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2, MessageCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ApiResponse, OOTDCommentItem, OOTDCommentPage } from "@/types";
import { useLanguage } from '@/components/providers/LanguageProvider';
import { socialError, socialMessages } from '@/lib/i18n/social-messages';

type Props = {
  readonly postId: string;
  readonly initialCount: number;
  readonly currentUserId?: string;
  readonly authStatus: "authenticated" | "loading" | "unauthenticated";
  readonly onCountChange: (delta: number) => void;
  readonly onRequireLogin: () => void;
};

export function OOTDComments({ postId, initialCount, currentUserId, authStatus, onCountChange, onRequireLogin }: Props) {
  const { locale } = useLanguage();
  const t = socialMessages[locale];
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<OOTDCommentItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (cursor?: string) => {
    setLoading(true);
    setError(null);
    try {
      const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
      const response = await fetch(`/api/ootd/${postId}/comments${suffix}`);
      const json = (await response.json()) as ApiResponse<OOTDCommentPage>;
      if (!response.ok || !json.success || !json.data) {
        setError(t.loadFailed);
        return;
      }
      const data = json.data;
      setItems((current) => cursor
        ? [...current, ...data.items.filter((item) => !current.some((existing) => existing.id === item.id))]
        : data.items);
      setNextCursor(data.nextCursor);
      setLoaded(true);
    } catch {
      setError(t.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && !loaded && !loading) void load();
  };

  const submit = async () => {
    if (authStatus !== "authenticated") {
      onRequireLogin();
      return;
    }
    const trimmed = content.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/ootd/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      const json = (await response.json()) as ApiResponse<OOTDCommentItem>;
      if (!response.ok || !json.success || !json.data) {
        setError(t.commentFailed);
        return;
      }
      const created = json.data;
      setItems((current) => [created, ...current]);
      setContent("");
      onCountChange(1);
    } catch {
      setError(t.commentFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (comment: OOTDCommentItem) => {
    if (!confirm(t.deleteComment)) return;
    setDeletingId(comment.id);
    setError(null);
    try {
      const response = await fetch(`/api/ootd/${postId}/comments/${comment.id}`, { method: "DELETE" });
      if (!response.ok) {
        setError(t.removeFailed);
        return;
      }
      setItems((current) => current.filter((item) => item.id !== comment.id));
      onCountChange(-1);
    } catch {
      setError(t.removeFailed);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="border-t border-white/5 bg-zinc-950/80 px-3 py-2">
      <button type="button" onClick={toggle} aria-expanded={open} aria-label={open ? t.collapse : `${t.expand} (${initialCount})`} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white">
        <MessageCircle className="h-4 w-4" /> {initialCount}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {loading && items.length === 0 && <p className="text-xs text-zinc-500">{t.commentsLoading}</p>}
          {!loading && loaded && items.length === 0 && <p className="text-xs text-zinc-500">{t.firstComment}</p>}
          {items.map((comment) => {
            const avatar = comment.author.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author.handle ?? comment.author.id}`;
            const identity = <><Image src={avatar} alt="" width={20} height={20} className="rounded-full" /><span className="font-semibold text-zinc-200">{comment.author.name}</span></>;
            return (
              <div key={comment.id} className="text-xs">
                <div className="flex items-center justify-between gap-2">
                  {comment.author.handle ? <Link href={`/profile/${comment.author.handle}`} className="flex items-center gap-1.5 hover:text-white">{identity}</Link> : <span className="flex items-center gap-1.5">{identity}</span>}
                  {(comment.isMine || comment.author.id === currentUserId) && <button type="button" onClick={() => void remove(comment)} disabled={deletingId === comment.id} aria-label={`${comment.author.name} — ${t.delete}`} className="text-zinc-500 hover:text-red-400 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /></button>}
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-zinc-300">{comment.content}</p>
                <time className="mt-1 block text-[10px] text-zinc-600">{new Date(comment.createdAt).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-GB')}</time>
              </div>
            );
          })}
          {nextCursor && <button type="button" onClick={() => void load(nextCursor)} disabled={loading} aria-label={t.previous} className="text-xs font-semibold text-brand-neon disabled:opacity-50">{loading ? t.loading : t.previous}</button>}
          {error && <div className="rounded-lg bg-red-500/10 px-2 py-1.5 text-xs text-red-300"><p>{socialError(error, locale)}</p>{!loaded && <button type="button" onClick={() => void load()} className="mt-1 underline">{t.retry}</button>}</div>}
          <div className="flex gap-2">
            <label htmlFor={`comment-${postId}`} className="sr-only">{t.content}</label>
            <textarea id={`comment-${postId}`} value={content} onChange={(event) => setContent(event.target.value)} maxLength={500} rows={1} placeholder={t.commentPlaceholder} className="min-w-0 flex-1 resize-none rounded-lg border border-white/10 bg-black/50 px-2.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-brand-neon/50 focus:outline-none" />
            <button type="button" onClick={() => void submit()} disabled={submitting || authStatus === "loading"} aria-label={submitting ? t.submitting : t.submit} className="rounded-lg bg-brand-neon px-3 text-xs font-bold text-black disabled:opacity-50">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t.register}</button>
          </div>
        </div>
      )}
    </div>
  );
}
