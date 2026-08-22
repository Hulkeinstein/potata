import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, UserPlus } from "lucide-react";
import type { NotificationItem } from "@/types";

type NotificationListItemProps = {
  readonly item: NotificationItem;
};

export function NotificationListItem({ item }: NotificationListItemProps) {
  const unread = item.readAt === null;
  const avatar = item.actor.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.actor.handle ?? item.actor.id}`;
  const cardClass = `flex gap-4 rounded-xl border p-4 transition-colors hover:border-brand-neon/30 ${unread ? "border-brand-neon/20 bg-brand-neon/5" : "border-white/5 bg-zinc-900/30"}`;

  let icon: React.ReactNode;
  let message: React.ReactNode;
  let href: string | null;
  switch (item.type) {
    case "COMMENT":
      icon = <MessageCircle className="h-4 w-4 text-brand-neon" aria-hidden="true" />;
      message = <><strong>{item.actor.name}</strong>님이 회원님의 룩에 댓글을 남겼습니다.</>;
      href = "/what-to-wear";
      break;
    case "LIKE":
      icon = <Heart className="h-4 w-4 text-red-400" aria-hidden="true" />;
      message = <><strong>{item.actor.name}</strong>님이 회원님의 룩에 좋아요를 눌렀습니다.</>;
      href = "/what-to-wear";
      break;
    case "FOLLOW":
      icon = <UserPlus className="h-4 w-4 text-purple-400" aria-hidden="true" />;
      message = <><strong>{item.actor.name}</strong>님이 회원님을 팔로우했습니다.</>;
      href = item.actor.handle ? `/profile/${encodeURIComponent(item.actor.handle)}` : null;
      break;
    default: {
      const exhaustive: never = item;
      return exhaustive;
    }
  }

  const content = <><Image src={avatar} alt="" width={40} height={40} className="h-10 w-10 rounded-full bg-zinc-800" /><div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-sm text-zinc-200">{icon}<p>{message}</p></div>{item.post?.caption && <p className="mt-1 truncate text-xs text-zinc-500">{item.post.caption}</p>}<time className="mt-2 block text-[11px] text-zinc-600">{new Date(item.createdAt).toLocaleString("ko-KR")}</time>{unread && <span className="mt-1 inline-block text-[10px] font-semibold text-brand-neon">읽지 않음</span>}</div>{item.post?.imageUrl && <Image src={item.post.imageUrl} alt="게시물 미리보기" width={56} height={56} className="h-14 w-14 rounded-lg object-cover" />}</>;

  return <li>{href ? <Link href={href} className={cardClass}>{content}</Link> : <div className={cardClass}>{content}</div>}</li>;
}
