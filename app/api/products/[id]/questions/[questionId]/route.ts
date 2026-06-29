import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractErrorMessage } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

// PATCH: 질문 수정 — 본인만(admin도 타인 질문 수정 불가)
// 보안 게이트: auth → params → body 파싱 → content 검증 → 조회(404) → 소유검증(403) → update → revalidate → 200
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> },
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

    // 2. URL params 분해 — body productId/questionId 불신
    const { id: productId, questionId } = await params;

    // 3. body JSON 파싱 — 실패 시 400
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    // 4. content 검증 — string·trim·≤2000
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

    // 5. IDOR 방지 — questionId로 먼저 조회, 없으면 404
    //    productId도 select → URL 경로와 실제 리소스 부모 일치 여부 검증
    const existing = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, userId: true, productId: true },
    });
    // 질문이 없거나 URL productId와 실제 productId 불일치 → 404 (존재 누출 방지)
    if (!existing || existing.productId !== productId) {
      return NextResponse.json(
        { success: false, error: "질문을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // 6. 소유권 검증 — 수정은 본인만(admin도 타인 질문 수정 불가)
    if (existing.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "본인 질문만 수정할 수 있습니다." },
        { status: 403 },
      );
    }

    // 7. 질문 내용 업데이트
    const updated = await prisma.question.update({
      where: { id: questionId },
      data: { content: content.trim() },
    });

    // 8. 캐시 무효화 — 상품 상세 페이지
    revalidatePath(`/product/${productId}`);

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    console.error("[questions PATCH] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 },
    );
  }
}

// DELETE: 질문 삭제 — 본인 또는 admin(답변 onDelete:Cascade 자동 삭제)
// 보안 게이트: auth → params → 조회(404) → 소유 OR admin(아니면 403) → delete → revalidate → 200
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> },
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

    // 2. URL params 분해
    const { id: productId, questionId } = await params;

    // 3. IDOR 방지 — questionId로 먼저 조회, 없으면 404
    //    productId도 select → URL 경로와 실제 리소스 부모 일치 여부 검증
    const existing = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, userId: true, productId: true },
    });
    // 질문이 없거나 URL productId와 실제 productId 불일치 → 404 (존재 누출 방지)
    if (!existing || existing.productId !== productId) {
      return NextResponse.json(
        { success: false, error: "질문을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // 4. 소유권 OR admin 검증 — 둘 다 아니면 403
    if (
      existing.userId !== session.user.id &&
      !isAdmin(session.user.email)
    ) {
      return NextResponse.json(
        { success: false, error: "삭제 권한이 없습니다." },
        { status: 403 },
      );
    }

    // 5. 질문 삭제 — answers onDelete:Cascade로 자동 삭제(수동 루프 금지)
    await prisma.question.delete({ where: { id: questionId } });

    // 6. 캐시 무효화 — 상품 상세 페이지
    revalidatePath(`/product/${productId}`);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[questions DELETE] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 },
    );
  }
}
