import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string; commentId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id: postId, commentId } = await params;
    const comment = await prisma.oOTDComment.findFirst({
      where: { id: commentId, postId },
      select: { id: true, userId: true },
    });
    if (!comment) {
      return NextResponse.json({ success: false, error: "댓글을 찾을 수 없습니다." }, { status: 404 });
    }
    if (comment.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: "본인 댓글만 삭제할 수 있습니다." }, { status: 403 });
    }
    await prisma.oOTDComment.delete({ where: { id: comment.id } });
    return NextResponse.json({ success: true, data: { id: comment.id } });
  } catch (error) {
    console.error("[ootd comment DELETE] error:", error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
