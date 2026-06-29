import { NextRequest, NextResponse } from "next/server";
import { validateHandle } from "@/lib/handle";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/auth/handle/check?handle=xxx
 *
 * handle 사용 가능 여부 확인.
 * - 형식 불통과(validateHandle) → { available: false } (형식 오류 상세 노출 금지)
 * - DB unique 체크 → { available: boolean }
 * 정보 노출 최소화 원칙: available boolean만 반환.
 */
export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get("handle") ?? "";

    // 형식 검증 — 실패해도 available:false만 반환 (에러 상세 노출 없음)
    const validation = validateHandle(raw);
    if (!validation.ok) {
      return NextResponse.json({ available: false });
    }

    const existing = await prisma.user.findUnique({
      where: { handle: validation.value },
      select: { id: true }, // 최소 필드만 — 상세 노출 없음
    });

    return NextResponse.json({ available: !existing });
  } catch (error) {
    console.error("[handle/check] error:", error);
    return NextResponse.json(
      { available: false },
      { status: 500 }
    );
  }
}
