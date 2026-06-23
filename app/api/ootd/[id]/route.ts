import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractErrorMessage } from "@/lib/auth";
import { removeOOTDImagesByUrl } from "@/lib/supabase-storage";

// DELETE: 본인 게시물 삭제 → DB 삭제(Cascade) 후 Storage 파일 동기 삭제(고아 방지)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id } = await params;

    const post = await prisma.oOTDPost.findUnique({
      where: { id },
      select: { id: true, userId: true, imageUrls: true },
    });
    if (!post) {
      return NextResponse.json({ success: false, error: "게시물을 찾을 수 없습니다." }, { status: 404 });
    }
    if (post.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "본인 게시물만 삭제할 수 있습니다." },
        { status: 403 }
      );
    }

    // DB 먼저 삭제(Cascade로 likes/태그 자동 정리) → 그다음 Storage 파일 삭제
    await prisma.oOTDPost.delete({ where: { id } });
    await removeOOTDImagesByUrl(post.imageUrls).catch((e) =>
      console.warn("[ootd DELETE] Storage 정리 실패(고아 파일 가능):", e)
    );

    return NextResponse.json({ success: true, data: { id } }, { status: 200 });
  } catch (error) {
    console.error("[ootd DELETE] error:", error);
    return NextResponse.json({ success: false, error: extractErrorMessage(error) }, { status: 500 });
  }
}
