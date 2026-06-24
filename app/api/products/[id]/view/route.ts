import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractErrorMessage } from "@/lib/auth";

// POST: 상품 조회수 +1 (public, atomic). HOT 랭킹용. 카탈로그 캐시는 건드리지 않음(revalidateTag 금지).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    // 없는 상품 id(P2025) 등은 조회 트래킹 실패로 간주 — 조용히 200(클라 fire-and-forget이라 사용자 영향 없음)
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2025") {
      return NextResponse.json({ success: false }, { status: 200 });
    }
    console.error("[products view POST] error:", error);
    return NextResponse.json({ success: false, error: extractErrorMessage(error) }, { status: 500 });
  }
}
