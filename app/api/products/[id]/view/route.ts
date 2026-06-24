import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { extractErrorMessage } from "@/lib/auth";

// POST: 상품 조회수 +1 (public, atomic). HOT 랭킹용.
// 조회수 increment 성공 시 revalidateTag("hot-products")로 HOT 랭킹 캐시만 무효화.
// 카탈로그 rows 캐시("products" 태그)는 건드리지 않음 — 상품 rows 재쿼리 없음.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
    // 조회수 증가 성공 → HOT 랭킹 캐시만 즉시 무효화(카탈로그 캐시 thrash 금지)
    // Next.js 15 타입: revalidateTag(tag, profile) — 빈 profile({})로 호출
    revalidateTag("hot-products", {});
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
