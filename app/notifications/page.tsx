"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, Loader2, MessageCircle, Heart } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiResponse, NotificationItem, NotificationPage, NotificationReadAllData } from "@/types";

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readError, setReadError] = useState(false);
  const readAttempted = useRef(false);

  const markAllRead = useCallback(async () => {
    setReadError(false);
    try {
      const response = await fetch("/api/notifications/read-all", { method: "PATCH" });
      const json = (await response.json()) as ApiResponse<NotificationReadAllData>;
      if (!response.ok || !json.success) {
        setReadError(true);
        return;
      }
      setItems((current) => current.map((item) => item.readAt ? item : { ...item, readAt: new Date().toISOString() }));
    } catch {
      setReadError(true);
    }
  }, []);

  const load = useCallback(async (cursor?: string) => {
    setLoading(true);
    setError(null);
    try {
      const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
      const response = await fetch(`/api/notifications${suffix}`);
      const json = (await response.json()) as ApiResponse<NotificationPage>;
      if (!response.ok || !json.success || !json.data) {
        setError(json.error ?? "알림을 불러오지 못했어요.");
        return;
      }
      const data = json.data;
      setItems((current) => cursor ? [...current, ...data.items.filter((item) => !current.some((existing) => existing.id === item.id))] : data.items);
      setNextCursor(data.nextCursor);
      if (!cursor && !readAttempted.current) {
        readAttempted.current = true;
        void markAllRead();
      }
    } catch {
      setError("네트워크 오류로 알림을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, [markAllRead]);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="min-h-screen bg-black pb-24 pt-20 text-white">
      <div className="mx-auto max-w-2xl px-6">
        <Link href="/mypage" className="text-sm text-zinc-400 transition-colors hover:text-white">← 마이페이지</Link>
        <div className="mt-3 mb-8 flex items-end justify-between gap-4">
          <div><h1 className="font-outfit text-2xl font-bold">Notifications</h1><p className="mt-1 text-sm text-zinc-400">내 룩에 대한 새로운 반응을 확인하세요.</p></div>
          <Bell className="h-7 w-7 text-brand-neon" />
        </div>

        {loading && items.length === 0 && <div className="space-y-3" aria-label="알림 불러오는 중">{[1, 2, 3].map((key) => <div key={key} className="h-24 animate-pulse rounded-xl bg-zinc-900/60" />)}</div>}
        {error && items.length === 0 && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center"><p className="text-sm text-red-300">{error}</p><button type="button" onClick={() => void load()} aria-label="알림 다시 불러오기" className="mt-3 rounded-full border border-red-400/30 px-4 py-2 text-sm">다시 시도</button></div>}
        {!loading && !error && items.length === 0 && <div className="rounded-xl border border-white/5 bg-zinc-900/20 py-24 text-center"><Bell className="mx-auto mb-4 h-10 w-10 text-zinc-700" /><p className="font-medium text-zinc-300">아직 알림이 없습니다.</p></div>}

        {readError && <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"><span>읽음 상태를 저장하지 못했어요.</span><button type="button" onClick={() => void markAllRead()} aria-label="모두 읽음으로 표시 재시도" className="shrink-0 font-semibold underline">다시 시도</button></div>}
        <ul className="space-y-3">
          {items.map((item) => {
            const unread = item.readAt === null;
            const avatar = item.actor.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.actor.handle ?? item.actor.id}`;
            return <li key={item.id}><Link href="/what-to-wear" className={`flex gap-4 rounded-xl border p-4 transition-colors hover:border-brand-neon/30 ${unread ? "border-brand-neon/20 bg-brand-neon/5" : "border-white/5 bg-zinc-900/30"}`}>
              <Image src={avatar} alt="" width={40} height={40} className="h-10 w-10 rounded-full bg-zinc-800" />
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-sm text-zinc-200">{item.type === "COMMENT" ? <MessageCircle className="h-4 w-4 text-brand-neon" /> : <Heart className="h-4 w-4 text-red-400" />}<p><strong>{item.actor.name}</strong>님이 회원님의 룩에 {item.type === "COMMENT" ? "댓글을 남겼습니다." : "좋아요를 눌렀습니다."}</p></div>{item.post.caption && <p className="mt-1 truncate text-xs text-zinc-500">{item.post.caption}</p>}<time className="mt-2 block text-[11px] text-zinc-600">{new Date(item.createdAt).toLocaleString("ko-KR")}</time>{unread && <span className="mt-1 inline-block text-[10px] font-semibold text-brand-neon">읽지 않음</span>}</div>
              {item.post.imageUrl && <Image src={item.post.imageUrl} alt="게시물 미리보기" width={56} height={56} className="h-14 w-14 rounded-lg object-cover" />}
            </Link></li>;
          })}
        </ul>
        {nextCursor && <button type="button" onClick={() => void load(nextCursor)} disabled={loading} aria-label="이전 알림 불러오기" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-semibold text-zinc-300 hover:border-white/20 disabled:opacity-50">{loading && <Loader2 className="h-4 w-4 animate-spin" />}이전 알림 불러오기</button>}
      </div>
    </main>
  );
}
