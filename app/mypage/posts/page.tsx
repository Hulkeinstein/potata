import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MyPostsClient } from "@/components/mypage/MyPostsClient";
import { prisma } from "@/lib/prisma";

export default async function MyPostsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/mypage/posts");

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { handle: true } });

  return <main className="min-h-screen bg-black pb-24 pt-20 text-white"><div className="mx-auto max-w-2xl px-4 sm:px-6"><Link href="/mypage" className="mb-3 inline-flex min-h-11 items-center text-sm text-zinc-400 hover:text-white">← 마이페이지</Link><MyPostsClient handle={user?.handle ?? null} /></div></main>;
}
