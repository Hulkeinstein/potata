"use client";
import Image from "next/image";
import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { OOTDComments } from "./OOTDComments";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { socialMessages } from "@/lib/i18n/social-messages";
import type { OOTDFeedItem } from "@/types";
export function OOTDFeedCard({
  item,
  isMine,
  onLike,
  onDelete,
  authStatus,
  currentUserId,
  onRequireLogin,
  onCommentCountChange,
}: {
  item: OOTDFeedItem;
  isMine: boolean;
  onLike: () => void;
  onDelete: () => void;
  authStatus: "authenticated" | "loading" | "unauthenticated";
  currentUserId?: string;
  onRequireLogin: () => void;
  onCommentCountChange: (delta: number) => void;
}) {
  const { locale } = useLanguage();
  const t = socialMessages[locale];
  const cover = item.imageUrls[0];
  const shopProduct = item.products[0];
  const avatarSeed = item.author.handle ?? item.author.id;
  const avatar =
    item.author.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;

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
              <span className="text-[10px] bg-white text-black px-2 py-0.5 rounded font-bold">{t.shop}</span>
            </Link>
          )}
        </div>
      </div>

      {/* 작성자 */}
      {item.author.handle ? (
        <Link
          href={`/profile/${item.author.handle}`}
          className="absolute top-2 left-2 flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-6 h-6 rounded-full bg-zinc-800 overflow-hidden border border-white/20">
            <Image src={avatar} alt={t.avatar} width={24} height={24} />
          </div>
          <span className="text-xs font-bold text-white drop-shadow-md">{item.author.name}</span>
        </Link>
      ) : (
        <div className="absolute top-2 left-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-zinc-800 overflow-hidden border border-white/20">
            <Image src={avatar} alt={t.avatar} width={24} height={24} />
          </div>
          <span className="text-xs font-bold text-white drop-shadow-md">{item.author.name}</span>
        </div>
      )}

      {/* 좋아요 + 본인 삭제 */}
      <div className="absolute top-2 right-2 flex items-center gap-2">
        {isMine && (
          <button
            onClick={onDelete}
            aria-label={t.delete}
            className="text-white/80 drop-shadow-md hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onLike}
          aria-label={item.isLiked ? t.unlike : t.like}
          className="flex items-center gap-1 text-white drop-shadow-md hover:text-red-500 transition-colors"
        >
          <Heart className={item.isLiked ? "w-4 h-4 fill-red-500 text-red-500" : "w-4 h-4"} />
          <span className="text-xs font-bold">{item.likeCount}</span>
        </button>
      </div>
      <OOTDComments postId={item.id} initialCount={item.commentCount} currentUserId={currentUserId} authStatus={authStatus} onRequireLogin={onRequireLogin} onCountChange={onCommentCountChange} />
    </div>
  );
}
