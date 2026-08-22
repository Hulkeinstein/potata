"use client";

import Link from "next/link";
import { Bell, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiResponse, NotificationItem, NotificationPage, NotificationReadAllData } from "@/types";
import { NOTIFICATIONS_READ_EVENT } from "@/lib/notification-events";
import { NotificationListItem } from "@/components/notifications/NotificationListItem";

export default function NotificationsPage() {
  const [items, setItems] = useState<readonly NotificationItem[]>([]);
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
      window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT));
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
        <ul className="space-y-3">{items.map((item) => <NotificationListItem key={item.id} item={item} />)}</ul>
        {nextCursor && <button type="button" onClick={() => void load(nextCursor)} disabled={loading} aria-label="이전 알림 불러오기" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-semibold text-zinc-300 hover:border-white/20 disabled:opacity-50">{loading && <Loader2 className="h-4 w-4 animate-spin" />}이전 알림 불러오기</button>}
      </div>
    </main>
  );
}
