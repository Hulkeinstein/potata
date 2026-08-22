"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileQuestion, ImageIcon, Loader2, MessageSquareText } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiResponse, MyPostItem, MyPostsResponse } from "@/types";
import { OOTDPostCard } from "./OOTDPostCard";
import { ProductPostCard } from "./ProductPostCard";

const TABS = ["ootd", "reviews", "questions"] as const;
type Tab = (typeof TABS)[number];
const LABELS: Record<Tab, string> = { ootd: "OOTD", reviews: "Reviews", questions: "Q&A" };

function parseTab(value: string | null): Tab {
  return TABS.find((tab) => tab === value) ?? "ootd";
}

export function MyPostsClient({ handle }: { readonly handle: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = parseTab(searchParams.get("tab"));
  const [tab, setTab] = useState<Tab>(urlTab);
  const [items, setItems] = useState<readonly MyPostItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedCursor, setFailedCursor] = useState<string | undefined>();
  const requestSequence = useRef(0);
  const tabRef = useRef<Tab>(urlTab);

  const load = useCallback(async (selected: Tab, cursor?: string) => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(null);
    setFailedCursor(undefined);
    try {
      const suffix = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
      const response = await fetch(`/api/users/me/posts?type=${selected}${suffix}`);
      const json = (await response.json()) as ApiResponse<MyPostsResponse["data"]>;
      if (requestId !== requestSequence.current) return;
      if (!response.ok || !json.success || !json.data) {
        setError(json.error ?? "게시물을 불러오지 못했어요.");
        setFailedCursor(cursor);
        return;
      }
      const data = json.data;
      setItems((current) => cursor ? [...current, ...data.items] : data.items);
      setNextCursor(data.nextCursor);
    } catch {
      if (requestId !== requestSequence.current) return;
      setError("네트워크 오류로 게시물을 불러오지 못했어요.");
      setFailedCursor(cursor);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (urlTab === tabRef.current) return;
    tabRef.current = urlTab;
    setTab(urlTab);
    setItems([]);
    setNextCursor(null);
  }, [urlTab]);
  useEffect(() => { void load(tab); }, [load, tab]);

  const selectTab = (next: Tab) => {
    if (next === tab) return;
    tabRef.current = next;
    setTab(next);
    setItems([]);
    router.replace(`/mypage/posts?tab=${next}`, { scroll: false });
  };
  const replaceItem = (next: MyPostItem) => setItems((current) => current.map((item) => item.id === next.id ? next : item));
  const removeItem = (id: string) => setItems((current) => current.filter((item) => item.id !== id));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="font-outfit text-2xl font-bold">My Posts</h1><p className="mt-1 text-sm text-zinc-400">내 OOTD, 리뷰와 Q&A를 관리하세요.</p></div>
        <Link href={handle ? `/profile/${handle}` : "/onboarding/handle?returnTo=/mypage/posts"} className="min-h-11 rounded-full border border-brand-neon/40 px-4 py-2.5 text-sm font-semibold text-brand-neon hover:bg-brand-neon/10">
          {handle ? "공개 프로필 보기" : "핸들 설정하기"}
        </Link>
      </div>

      <div role="tablist" aria-label="내 게시물 유형" className="sticky top-16 z-20 mb-6 flex overflow-x-auto border-b border-white/10 bg-black/90 no-scrollbar">
        {TABS.map((value) => <button key={value} type="button" role="tab" aria-selected={tab === value} aria-controls={`panel-${value}`} onClick={() => selectTab(value)} className={`min-h-11 shrink-0 border-b-2 px-5 text-sm font-semibold ${tab === value ? "border-brand-neon text-brand-neon" : "border-transparent text-zinc-400 hover:text-white"}`}>{LABELS[value]}</button>)}
      </div>

      <section id={`panel-${tab}`} role="tabpanel" aria-label={`${LABELS[tab]} 목록`}>
        {loading && items.length === 0 && <div aria-label="내 게시물 불러오는 중" className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[1, 2, 3, 4].map((key) => <div key={key} className="aspect-square animate-pulse rounded-xl bg-zinc-900/60" />)}</div>}
        {error && items.length === 0 && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center"><p className="text-sm text-red-300">{error}</p><button type="button" onClick={() => void load(tab)} className="mt-3 min-h-11 rounded-full border border-red-400/30 px-5 text-sm">다시 시도</button></div>}
        {!loading && !error && items.length === 0 && <EmptyState tab={tab} />}
        {items.length > 0 && (tab === "ootd" ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{items.map((item) => item.type === "ootd" && <OOTDPostCard key={item.id} item={item} onChange={replaceItem} onDelete={removeItem} />)}</div> : <div className="space-y-4">{items.map((item) => item.type !== "ootd" && <ProductPostCard key={item.id} item={item} onChange={replaceItem} onDelete={removeItem} />)}</div>)}
        {error && items.length > 0 && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center"><p className="text-sm text-red-300">{error}</p><button type="button" onClick={() => void load(tab, failedCursor)} className="mt-2 min-h-11 rounded-full border border-red-400/30 px-5 text-sm">다시 시도</button></div>}
        {nextCursor && !error && <button type="button" disabled={loading} onClick={() => void load(tab, nextCursor)} className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-sm font-semibold disabled:opacity-50">{loading && <Loader2 className="h-4 w-4 animate-spin" />}더 보기</button>}
      </section>
    </>
  );
}

function EmptyState({ tab }: { readonly tab: Tab }) {
  const details = tab === "ootd"
    ? { icon: ImageIcon, text: "아직 올린 OOTD가 없습니다.", href: "/what-to-wear", action: "첫 룩 올리기" }
    : tab === "reviews"
      ? { icon: MessageSquareText, text: "아직 작성한 리뷰가 없습니다.", href: "/shop", action: "상품 둘러보기" }
      : { icon: FileQuestion, text: "아직 작성한 Q&A가 없습니다.", href: "/shop", action: "상품 둘러보기" };
  return <div className="rounded-xl border border-white/5 bg-zinc-900/20 py-20 text-center"><details.icon className="mx-auto mb-4 h-10 w-10 text-zinc-700" /><p className="text-zinc-300">{details.text}</p><Link href={details.href} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-brand-neon px-5 text-sm font-semibold text-black">{details.action}</Link></div>;
}
