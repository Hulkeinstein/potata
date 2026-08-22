import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST: 팔로우/언팔로우 멱등 토글 (like 패턴 복제)
// [id] = 팔로우 대상(target) userId — follower는 session에서만 취득(IDOR 방어)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // follower는 반드시 session에서만 — body/param에서 읽으면 IDOR
    const followerId = session.user.id;
    const { id: targetId } = await params;

    // self-follow 차단
    if (followerId === targetId) {
      return NextResponse.json(
        { success: false, error: "자기 자신을 팔로우할 수 없습니다." },
        { status: 400 }
      );
    }

    // 대상 유저 존재 확인
    const targetUser = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const state = await prisma.$transaction(async (tx) => {
      const pair = { followerId, followingId: targetId };
      const existing = await tx.follow.findUnique({
        where: { followerId_followingId: pair },
        select: { id: true },
      });

      if (existing) {
        await tx.follow.deleteMany({ where: pair });
      } else {
        const created = await tx.follow.createMany({ data: [pair], skipDuplicates: true });
        if (created.count === 1) {
          const follow = await tx.follow.findUnique({
            where: { followerId_followingId: pair },
            select: { id: true },
          });
          if (follow) {
            await tx.notification.create({
              data: { recipientId: targetId, actorId: followerId, type: "FOLLOW", sourceFollowId: follow.id },
            });
          }
        }
      }

      const [committedFollow, followerCount] = await Promise.all([
        tx.follow.findUnique({ where: { followerId_followingId: pair }, select: { id: true } }),
        tx.follow.count({ where: { followingId: targetId } }),
      ]);
      return { following: committedFollow !== null, followerCount };
    });

    return NextResponse.json(
      { success: true, data: { targetUserId: targetId, ...state } },
      { status: 200 }
    );
  } catch (error) {
    console.error("[follow toggle] error:", error);
    return NextResponse.json(
      { success: false, error: "팔로우 상태를 변경하지 못했습니다." },
      { status: 500 }
    );
  }
}
