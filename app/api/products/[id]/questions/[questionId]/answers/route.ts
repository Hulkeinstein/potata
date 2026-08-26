import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

const CONTENT_MAX_LENGTH = 2000;

// POST /api/products/[id]/questions/[questionId]/answers — admin only
// 게이트: auth 401 → isAdmin 403 → 질문 존재 404 → content 검증 400 → create → 201
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> },
) {
  try {
    // 1. 인증 게이트
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // 2. admin 게이트 — 비admin 403 (body 파싱 전에 최상위로 배치)
    if (!isAdmin(session.user.email)) {
      return NextResponse.json(
        { success: false, error: "관리자만 답변할 수 있습니다." },
        { status: 403 },
      );
    }

    // 3. URL params — body productId/questionId 불신
    const { id: productId, questionId } = await params;

    // 4. JSON body 파싱
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    // 5. content 검증
    const { content } = body as Record<string, unknown>;
    if (
      typeof content !== "string" ||
      content.trim().length === 0 ||
      content.trim().length > CONTENT_MAX_LENGTH
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `답변 내용은 1자 이상 ${CONTENT_MAX_LENGTH}자 이하여야 합니다.`,
        },
        { status: 400 },
      );
    }

    // 6. 질문 존재 확인 + URL productId와 실제 리소스 부모 일치 검증
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, productId: true },
    });
    // 질문이 없거나 URL productId와 실제 productId 불일치 → 404 (존재 누출 방지)
    if (!question || question.productId !== productId) {
      return NextResponse.json(
        { success: false, error: "질문을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // 7. 답변 생성 — session.user.id + URL param만 신뢰
    const answer = await prisma.answer.create({
      data: {
        questionId,
        userId: session.user.id,
        content: content.trim(),
      },
    });

    revalidatePath(`/product/${productId}`);

    return NextResponse.json({ success: true, data: answer }, { status: 201 });
  } catch (error) {
    console.error("[answers POST] error:", error);
    return NextResponse.json(
      { success: false, error: "답변 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
