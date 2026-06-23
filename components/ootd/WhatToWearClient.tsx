"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Heart, Plus, X, Trash2, Loader2, ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type {
  ApiResponse,
  OOTDFeedData,
  OOTDFeedItem,
  OOTDLikeData,
  Product,
} from "@/types";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGES = 5;
const MAX_SIZE = 5 * 1024 * 1024;

export function WhatToWearClient({ products }: { products: Product[] }) {
  const { status } = useSession();
  const { data: session } = useSession();
  const router = useRouter();
  const myId = session?.user?.id;

  const [items, setItems] = useState<OOTDFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/ootd");
      if (res.ok) {
        const json = (await res.json()) as ApiResponse<OOTDFeedData>;
        if (json.success && json.data) setItems(json.data.items);
      }
    } catch {
      // 네트워크 실패 — 조용히
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const requireLogin = (): boolean => {
    if (status !== "authenticated") {
      if (confirm("로그인이 필요한 서비스입니다. 로그인 페이지로 이동하시겠습니까?")) {
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
    if (!confirm("이 게시물을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/ootd/${post.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((p) => p.id !== post.id));
    } else {
      alert("삭제에 실패했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-black pb-20 pt-16 text-white">
      {/* Header */}
      <div className="sticky top-16 z-10 bg-black/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 h-14">
        <h1 className="text-lg font-bold tracking-tight">What to Wear?</h1>
        <button
          onClick={() => requireLogin() && setShowForm(true)}
          className="text-xs font-bold bg-white text-black px-4 py-1.5 rounded-full hover:bg-gray-200 transition-colors flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Post My Look
        </button>
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
          <p className="font-medium">아직 게시물이 없어요.</p>
          <p className="text-sm mt-1">첫 룩을 올려보세요!</p>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 gap-4 px-4 py-6 space-y-4">
          {items.map((item) => (
            <OOTDCard
              key={item.id}
              item={item}
              isMine={!!myId && item.author.id === myId}
              onLike={() => toggleLike(item)}
              onDelete={() => deletePost(item)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <PostForm
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

function OOTDCard({
  item,
  isMine,
  onLike,
  onDelete,
}: {
  item: OOTDFeedItem;
  isMine: boolean;
  onLike: () => void;
  onDelete: () => void;
}) {
  const cover = item.imageUrls[0];
  const shopProduct = item.products[0];
  const avatar =
    item.author.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.author.id}`;

  return (
    <div className="break-inside-avoid relative group rounded-xl overflow-hidden bg-zinc-900 mb-4 border border-white/5 hover:border-purple-500/50 transition-colors">
      <div className="relative w-full">
        {cover && (
          <Image
            src={cover}
            alt={item.caption ?? "OOTD"}
            width={500}
            height={600}
            className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity"
          />
        )}

        {/* 슬라이드 표시(여러 장) */}
        {item.imageUrls.length > 1 && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-2 py-0.5 rounded-full text-[10px] font-bold">
            1 / {item.imageUrls.length}
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* 캡션 + SHOP 태그 */}
        <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
          {item.caption && (
            <p className="text-white text-xs font-medium mb-2 line-clamp-2 drop-shadow-md">
              {item.caption}
            </p>
          )}
          {shopProduct && (
            <Link
              href={`/product/${shopProduct.id}`}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-2 flex items-center justify-between hover:bg-white/20 transition-colors"
            >
              <span className="text-xs font-bold text-white truncate flex-1 mr-2">
                {shopProduct.name}
              </span>
              <span className="text-[10px] bg-white text-black px-2 py-0.5 rounded font-bold">SHOP</span>
            </Link>
          )}
        </div>
      </div>

      {/* 작성자 */}
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-zinc-800 overflow-hidden border border-white/20">
          <Image src={avatar} alt="avatar" width={24} height={24} />
        </div>
        <span className="text-xs font-bold text-white drop-shadow-md">{item.author.name}</span>
      </div>

      {/* 좋아요 + 본인 삭제 */}
      <div className="absolute top-2 right-2 flex items-center gap-2">
        {isMine && (
          <button
            onClick={onDelete}
            aria-label="삭제"
            className="text-white/80 drop-shadow-md hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onLike}
          aria-label="좋아요"
          className="flex items-center gap-1 text-white drop-shadow-md hover:text-red-500 transition-colors"
        >
          <Heart className={item.isLiked ? "w-4 h-4 fill-red-500 text-red-500" : "w-4 h-4"} />
          <span className="text-xs font-bold">{item.likeCount}</span>
        </button>
      </div>
    </div>
  );
}

function PostForm({
  products,
  onClose,
  onPosted,
}: {
  products: Product[];
  onClose: () => void;
  onPosted: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const picked = Array.from(e.target.files ?? []);
    if (picked.length > MAX_IMAGES) {
      setError(`사진은 최대 ${MAX_IMAGES}장까지 올릴 수 있어요.`);
      return;
    }
    for (const f of picked) {
      if (!ALLOWED.includes(f.type)) {
        setError("jpg/png/webp 이미지만 올릴 수 있어요.");
        return;
      }
      if (f.size > MAX_SIZE) {
        setError("각 사진은 5MB 이하여야 해요.");
        return;
      }
    }
    setFiles(picked);
  };

  const toggleProduct = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const submit = async () => {
    if (files.length === 0) {
      setError("사진을 최소 1장 선택해주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("images", f));
      if (caption.trim()) fd.append("caption", caption.trim());
      selected.forEach((id) => fd.append("productIds", id));

      const res = await fetch("/api/ootd", { method: "POST", body: fd });
      const data = (await res.json()) as ApiResponse<{ id: string }>;
      if (res.ok && data.success) {
        onPosted();
      } else {
        setError(data.error ?? "게시에 실패했어요.");
      }
    } catch {
      setError("네트워크 오류가 발생했어요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[85vh] overflow-y-auto bg-cinematic-800 border border-white/10 rounded-2xl p-6"
      >
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-4">Post My Look</h2>

        {/* 파일 선택 */}
        <label className="block mb-4">
          <span className="text-sm text-zinc-300 font-medium">사진 (최대 5장)</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={onFileChange}
            className="mt-2 block w-full text-sm text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white file:text-black file:font-bold file:text-xs hover:file:bg-gray-200"
          />
          {files.length > 0 && (
            <p className="text-xs text-brand-neon mt-2">{files.length}장 선택됨</p>
          )}
        </label>

        {/* 캡션 */}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="이 착장을 설명해보세요..."
          rows={2}
          className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white mb-4 focus:outline-none focus:border-purple-500"
        />

        {/* 상품 태그 */}
        <div className="mb-5">
          <span className="text-sm text-zinc-300 font-medium">상품 태그 (선택)</span>
          <div className="mt-2 max-h-32 overflow-y-auto space-y-1 border border-white/5 rounded-lg p-2">
            {products.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  onChange={() => toggleProduct(p.id)}
                  className="accent-purple-500"
                />
                <span className="truncate">
                  {p.brand} · {p.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2 mb-3">{error}</p>
        )}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full py-3 bg-brand-neon text-black font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-white transition-colors disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {submitting ? "게시 중..." : "게시하기"}
        </button>
      </div>
    </div>
  );
}
