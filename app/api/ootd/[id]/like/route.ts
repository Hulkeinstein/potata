import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function readLikeState(userId: string, postId: string) {
  return prisma.$transaction(async (tx) => {
    const [like, likeCount] = await Promise.all([
      tx.oOTDLike.findUnique({ where: { userId_postId: { userId, postId } }, select: { id: true } }),
      tx.oOTDLike.count({ where: { postId } }),
    ]);
    return { liked: like !== null, likeCount };
  });
}

async function createLike(userId: string, postId: string, recipientId: string) {
  return prisma.$transaction(async (tx) => {
    const like = await tx.oOTDLike.create({ data: { userId, postId }, select: { id: true } });
    if (recipientId !== userId) {
      await tx.notification.create({
        data: { recipientId, actorId: userId, postId, type: "LIKE", sourceLikeId: like.id },
      });
    }
  });
}

async function toggleLike(userId: string, postId: string) {
  return prisma.$transaction(async (tx) => {
    const post = await tx.oOTDPost.findUnique({
      where: { id: postId },
      select: { id: true, userId: true },
    });
    if (!post) return { kind: "missing" } as const;
    const existing = await tx.oOTDLike.findUnique({
      where: { userId_postId: { userId, postId } },
      select: { id: true },
    });
    if (existing) {
      await tx.oOTDLike.delete({ where: { id: existing.id } });
      return { kind: "unliked" } as const;
    }
    const like = await tx.oOTDLike.create({ data: { userId, postId }, select: { id: true } });
    if (post.userId !== userId) {
      await tx.notification.create({
        data: { recipientId: post.userId, actorId: userId, postId, type: "LIKE", sourceLikeId: like.id },
      });
    }
    return { kind: "liked" } as const;
  });
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id: postId } = await params;

    // 존재하는 게시물만 좋아요 가능
    let outcome: { readonly kind: "missing" | "liked" | "unliked" };
    try {
      outcome = await toggleLike(userId, postId);
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      const state = await readLikeState(userId, postId);
      if (state.liked) {
        return NextResponse.json({ success: true, data: { postId, ...state } });
      }
      try {
        const post = await prisma.oOTDPost.findUnique({
          where: { id: postId },
          select: { id: true, userId: true },
        });
        if (!post) {
          return NextResponse.json({ success: false, error: "게시물을 찾을 수 없습니다." }, { status: 404 });
        }
        await createLike(userId, postId, post.userId);
        outcome = { kind: "liked" };
      } catch (retryError) {
        if (!isUniqueConflict(retryError)) throw retryError;
        const finalState = await readLikeState(userId, postId);
        if (finalState.liked) {
          return NextResponse.json({ success: true, data: { postId, ...finalState } });
        }
        return NextResponse.json(
          { success: false, error: "좋아요 처리 중 충돌이 발생했습니다. 다시 시도해 주세요." },
          { status: 409 },
        );
      }
    }

    if (outcome.kind === "missing") {
      return NextResponse.json({ success: false, error: "게시물을 찾을 수 없습니다." }, { status: 404 });
    }
    const likeCount = await prisma.oOTDLike.count({ where: { postId } });
    return NextResponse.json({ success: true, data: { postId, liked: outcome.kind === "liked", likeCount } });
  } catch (error) {
    console.error("[ootd like] error:", error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
