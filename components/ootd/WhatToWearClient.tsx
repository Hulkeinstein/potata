"use client";

import { useCallback, useEffect, useState } from "react";


import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { OOTDPostForm } from "./OOTDPostForm";
import { OOTDFeedCard } from "./OOTDFeedCard";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { socialMessages } from "@/lib/i18n/social-messages";
import { HandleSetupBanner } from "@/components/profile/HandleSetupBanner";

import type {
  ApiResponse,
  OOTDFeedData,
  OOTDFeedItem,
  OOTDLikeData,
  Product,
} from "@/types";

export function WhatToWearClient({ products }: { products: Product[] }) {
  const { locale } = useLanguage();
  const t = socialMessages[locale];
  const { status } = useSession();
  const { data: session } = useSession();
  const router = useRouter();
  const myId = session?.user?.id;

  const [items, setItems] = useState<OOTDFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<"all" | "following">("all");

  const loadFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/ootd?tab=" + tab);
      if (res.ok) {
        const json = (await res.json()) as ApiResponse<OOTDFeedData>;
        if (json.success && json.data) setItems(json.data.items);
      }
    } catch {
      // 네트워크 실패 — 조용히
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    // tab 변경 또는 마운트 시 피드 로드.
    loadFeed();
  }, [loadFeed]);

  const requireLogin = (): boolean => {
    if (status !== "authenticated") {
      if (confirm(t.login)) {
        router.push("/login");
      }
      return false;
    }
    return true;
  };

  // 낙관적 좋아요 토글 + fire-and-forget(실패 롤백)
  const toggleLike = (post: OOTDFeedItem) => {
    if (!requireLogin()) return;
    setItems((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, isLiked: !p.isLiked, likeCount: p.likeCount + (p.isLiked ? -1 : 1) }
          : p
      )
    );
    fetch(`/api/ootd/${post.id}/like`, { method: "POST" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`like ${res.status}`);
        const json = (await res.json()) as ApiResponse<OOTDLikeData>;
        if (json.success && json.data) {
          const d = json.data;
          setItems((prev) =>
            prev.map((p) => (p.id === post.id ? { ...p, isLiked: d.liked, likeCount: d.likeCount } : p))
          );
        }
      })
      .catch(() => {
        setItems((prev) =>
          prev.map((p) =>
            p.id === post.id ? { ...p, isLiked: post.isLiked, likeCount: post.likeCount } : p
          )
        );
        console.warn("[OOTD] 좋아요 저장 실패, 롤백");
      });
  };

  const deletePost = async (post: OOTDFeedItem) => {
    if (!confirm(t.deletePost)) return;
    const res = await fetch(`/api/ootd/${post.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((p) => p.id !== post.id));
    } else {
      alert(t.deleteFailed);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-20 pt-16 text-white">
      {/* handle 없는 로그인 유저 비강제 유도 배너 */}
      <div className="px-4 pt-4">
        <HandleSetupBanner returnTo="/what-to-wear" />
      </div>

      {/* Header */}
      <div className="sticky top-16 z-10 bg-black/80 backdrop-blur-md border-b border-white/5 px-4 h-14">
        <div className="flex items-center justify-between h-full">
          {/* 탭 버튼 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTab("all")}
              className={`text-sm font-bold px-3 py-1 rounded-full transition-colors ${
                tab === "all"
                  ? "text-brand-neon underline underline-offset-4"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {t.all}
            </button>
            <button
              onClick={() => {
                if (!requireLogin()) return;
                setTab("following");
              }}
              className={`text-sm font-bold px-3 py-1 rounded-full transition-colors ${
                tab === "following"
                  ? "text-brand-neon underline underline-offset-4"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {t.following}
            </button>
          </div>

          <button
            onClick={() => requireLogin() && setShowForm(true)}
            className="text-xs font-bold bg-white text-black px-4 py-1.5 rounded-full hover:bg-gray-200 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> {t.postLook}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="columns-2 md:columns-3 gap-4 px-4 py-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="w-full aspect-3/4 mb-4 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center text-zinc-400">
          <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
          <p className="font-medium">{t.empty}</p>
          <p className="text-sm mt-1">{t.firstLook}</p>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 gap-4 px-4 py-6 space-y-4">
          {items.map((item) => (
            <OOTDFeedCard
              key={item.id}
              item={item}
              isMine={!!myId && item.author.id === myId}
              onLike={() => toggleLike(item)}
              onDelete={() => deletePost(item)}
              authStatus={status}
              currentUserId={myId}
              onRequireLogin={() => { requireLogin(); }}
              onCommentCountChange={(delta) => setItems((current) => current.map((post) => post.id === item.id ? { ...post, commentCount: Math.max(0, post.commentCount + delta) } : post))}
            />
          ))}
        </div>
      )}

      {showForm && (
        <OOTDPostForm
          products={products}
          onClose={() => setShowForm(false)}
          onPosted={() => {
            setShowForm(false);
            void loadFeed();
          }}
        />
      )}
    </div>
  );
}
