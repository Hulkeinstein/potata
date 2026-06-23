import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractErrorMessage } from "@/lib/auth";

// POST: OOTD 좋아요 멱등 토글 (wishlist 패턴 재사용)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id: postId } = await params;

    // 존재하는 게시물만 좋아요 가능
    const post = await prisma.oOTDPost.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) {
      return NextResponse.json({ success: false, error: "게시물을 찾을 수 없습니다." }, { status: 404 });
    }

    const existing = await prisma.oOTDLike.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    let liked: boolean;
    if (existing) {
      await prisma.oOTDLike.delete({ where: { id: existing.id } });
      liked = false;
    } else {
      // 멀티탭/연타 경쟁은 skipDuplicates로 멱등 흡수
      await prisma.oOTDLike.createMany({ data: [{ userId, postId }], skipDuplicates: true });
      liked = true;
    }

    const likeCount = await prisma.oOTDLike.count({ where: { postId } });
    return NextResponse.json({ success: true, data: { postId, liked, likeCount } }, { status: 200 });
  } catch (error) {
    console.error("[ootd like] error:", error);
    return NextResponse.json({ success: false, error: extractErrorMessage(error) }, { status: 500 });
  }
}
