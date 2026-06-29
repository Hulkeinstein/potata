import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractErrorMessage } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

// PATCH: 답변 수정 — admin only
// 보안 게이트: auth(401) → isAdmin(403) → 답변 존재(404) → content 검증(400) → update → revalidate → 200
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string; answerId: string }> },
) {
  try {
    // 1. 인증 게이트 — session.user.id만 신뢰 (body userId 불신)
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // 2. admin 게이트 — 답변 수정은 admin only (소유 기반 허용 금지)
    if (!isAdmin(session.user.email)) {
      return NextResponse.json(
        { success: false, error: "관리자만 답변을 수정할 수 있습니다." },
        { status: 403 },
      );
    }

    // 3. URL params 분해 — body id 불신
    const { id: productId, questionId, answerId } = await params;

    // 4. body JSON 파싱 — 실패 시 400
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    // 5. content 검증 — string·trim·≤2000
    const content =
      body !== null && typeof body === "object" && "content" in body
        ? (body as Record<string, unknown>).content
        : undefined;

    if (typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "content는 비어있을 수 없습니다." },
        { status: 400 },
      );
    }
    if (content.trim().length > 2000) {
      return NextResponse.json(
        { success: false, error: "content는 2000자 이하여야 합니다." },
        { status: 400 },
      );
    }

    // 6. 답변 존재 확인 + 경로 정합 검증 (answerId→questionId, question→productId 부모 체인)
    const existing = await prisma.answer.findUnique({
      where: { id: answerId },
      select: {
        id: true,
        questionId: true,
        question: { select: { productId: true } },
      },
    });
    // 없거나 URL questionId·productId와 실제 부모 불일치 → 404 (존재 누출 방지)
    if (
      !existing ||
      existing.questionId !== questionId ||
      existing.question.productId !== productId
    ) {
      return NextResponse.json(
        { success: false, error: "답변을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // 7. 답변 내용 업데이트
    const updated = await prisma.answer.update({
      where: { id: answerId },
      data: { content: content.trim() },
    });

    // 8. 캐시 무효화 — 상품 상세 페이지
    revalidatePath(`/product/${productId}`);

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    console.error("[answers PATCH] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 },
    );
  }
}

// DELETE: 답변 삭제 — admin only
// 보안 게이트: auth(401) → isAdmin(403) → 답변 존재(404) → delete → revalidate → 200
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string; answerId: string }> },
) {
  try {
    // 1. 인증 게이트 — session.user.id만 신뢰
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // 2. admin 게이트 — 답변 삭제는 admin only
    if (!isAdmin(session.user.email)) {
      return NextResponse.json(
        { success: false, error: "관리자만 답변을 삭제할 수 있습니다." },
        { status: 403 },
      );
    }

    // 3. URL params 분해 — body id 불신
    const { id: productId, questionId, answerId } = await params;

    // 4. 답변 존재 확인 + 경로 정합 검증 (answerId→questionId, question→productId 부모 체인)
    const existing = await prisma.answer.findUnique({
      where: { id: answerId },
      select: {
        id: true,
        questionId: true,
        question: { select: { productId: true } },
      },
    });
    // 없거나 URL questionId·productId와 실제 부모 불일치 → 404 (존재 누출 방지)
    if (
      !existing ||
      existing.questionId !== questionId ||
      existing.question.productId !== productId
    ) {
      return NextResponse.json(
        { success: false, error: "답변을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // 5. 답변 삭제
    await prisma.answer.delete({ where: { id: answerId } });

    // 6. 캐시 무효화 — 상품 상세 페이지
    revalidatePath(`/product/${productId}`);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[answers DELETE] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 },
    );
  }
}
