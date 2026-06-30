import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractErrorMessage } from "@/lib/auth";

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

    // 멱등 토글: findUnique → delete(언팔로우) or createMany skipDuplicates(팔로우)
    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId: targetId } },
    });

    let following: boolean;
    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
      following = false;
    } else {
      // 연타/경쟁 조건 → skipDuplicates로 멱등 흡수(unique 위반 500 방지)
      await prisma.follow.createMany({
        data: [{ followerId, followingId: targetId }],
        skipDuplicates: true,
      });
      following = true;
    }

    // 대상의 팔로워 수(비정규화 금지 — 항상 count 쿼리)
    const followerCount = await prisma.follow.count({
      where: { followingId: targetId },
    });

    return NextResponse.json(
      { success: true, data: { targetUserId: targetId, following, followerCount } },
      { status: 200 }
    );
  } catch (error) {
    console.error("[follow toggle] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}
