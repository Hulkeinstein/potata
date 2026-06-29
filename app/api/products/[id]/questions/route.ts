import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractErrorMessage } from "@/lib/auth";
import type { Question, Answer, QuestionListResponse, CreateQuestionRequest } from "@/types";

// GET: 공개 질문 목록 조회 (인증 불필요)
// 해당 productId 질문 최신순 목록 + 답변 include(createdAt asc) + userName 평탄화
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: productId } = await params;

    const [rows, questionCount] = await Promise.all([
      prisma.question.findMany({
        where: { productId },
        orderBy: { createdAt: "desc" },
        include: {
          answers: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              questionId: true,
              content: true,
              createdAt: true,
              updatedAt: true,
              user: { select: { name: true } },
            },
          },
          user: { select: { name: true } },
        },
      }),
      prisma.question.count({ where: { productId } }),
    ]);

    const questions: Question[] = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user.name ?? "",
      productId: r.productId,
      content: r.content,
      answers: r.answers.map((a): Answer => ({
        id: a.id,
        questionId: a.questionId,
        userName: a.user.name ?? "",
        content: a.content,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    const data: QuestionListResponse = { questions, questionCount };

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("[questions GET] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 },
    );
  }
}

// POST: 질문 작성 — 전체 로그인 유저 허용 (구매 게이트 없음)
// 보안 게이트: auth → JSON 파싱 → content 검증 → 상품 존재 → question.create
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

    // 2. URL [id] param — body productId 불신
    const { id: productId } = await params;

    // 3. JSON 파싱 — 파싱 실패 시 400 (리뷰 패턴 동일, 좁은 try 허용)
    let body: CreateQuestionRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    const content = body.content;

    // 4. content 검증 — string + 공백만인 경우 거부 + 최대 2000자
    if (typeof content !== "string" || content.trim() === "") {
      return NextResponse.json(
        { success: false, error: "질문 내용을 입력해 주세요." },
        { status: 400 },
      );
    }
    if (content.trim().length > 2000) {
      return NextResponse.json(
        { success: false, error: "질문은 2000자 이하여야 합니다." },
        { status: 400 },
      );
    }

    // 5. 상품 존재 확인 — FK P2003을 사용자 친화 400으로 선차단
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json(
        { success: false, error: "존재하지 않는 상품입니다." },
        { status: 400 },
      );
    }

    // 6. 질문 생성 — content.trim() 저장 (앞뒤 공백 제거)
    const question = await prisma.question.create({
      data: {
        userId: session.user.id,
        productId,
        content: content.trim(),
      },
    });

    // 7. 캐시 무효화 — 상품 상세 페이지 (Product 집계 변경 없음 → path만)
    revalidatePath(`/product/${productId}`);

    return NextResponse.json({ success: true, data: question }, { status: 201 });
  } catch (error) {
    console.error("[questions POST] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 },
    );
  }
}
