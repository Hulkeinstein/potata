import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { extractErrorMessage } from "@/lib/auth";
import { recomputeProductRating, hasPurchasedProduct } from "@/lib/reviews";
import type { CreateReviewRequest, Review, ReviewListResponse } from "@/types";

// GET: 공개 리뷰 목록 조회 (인증 불필요)
// 해당 productId 리뷰 최신순 목록 + Product.rating(denormalized SSoT) 반환
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: productId } = await params;

    const [rows, product] = await Promise.all([
      prisma.review.findMany({
        where: { productId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userId: true,
          productId: true,
          rating: true,
          comment: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { name: true } },
        },
      }),
      // rating/reviewCount는 Product 컬럼이 denormalized SSoT
      prisma.product.findUnique({
        where: { id: productId },
        select: { rating: true, reviewCount: true },
      }),
    ]);

    const reviews: Review[] = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user.name ?? "",
      productId: r.productId,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    const data: ReviewListResponse = {
      reviews,
      averageRating: product?.rating ?? null,
      reviewCount: product?.reviewCount ?? rows.length,
    };

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("[reviews GET] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 },
    );
  }
}

// POST: 리뷰 작성·수정(upsert) — 로그인 구매자 전용
// 보안 게이트: auth → 상품 존재 → 구매자 판정(hasPurchasedProduct) → rating 검증
// $transaction: review.upsert + recomputeProductRating (원자적 집계)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. 인증 게이트 — session.user.id만 신뢰 (body userId 불신)
    // H1: session.user 존재만으론 부족 — id가 undefined인 세션이 게이트 우회 가능
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // 2. URL [id] param — body productId 불신
    const { id: productId } = await params;

    // 3. body 파싱 — 파싱 실패 시 400(M1)
    let body: CreateReviewRequest;
    try {
      body = (await request.json()) as CreateReviewRequest;
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }
    const { rating, comment } = body;

    // 4. rating 검증(정수 1~5)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "rating은 1~5 사이 정수여야 합니다." },
        { status: 400 },
      );
    }

    // 4-b. comment 타입/길이 검증(M2) — 존재하면 string + 최대 2000자
    if (comment !== undefined && comment !== null) {
      if (typeof comment !== "string") {
        return NextResponse.json(
          { success: false, error: "Invalid comment" },
          { status: 400 },
        );
      }
      if (comment.length > 2000) {
        return NextResponse.json(
          { success: false, error: "Comment too long (max 2000)" },
          { status: 400 },
        );
      }
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

    // 6. 구매자 권한 게이트 — 비구매자 403
    if (!(await hasPurchasedProduct(session.user.id, productId))) {
      return NextResponse.json(
        { success: false, error: "해당 상품을 구매한 사용자만 리뷰를 작성할 수 있습니다." },
        { status: 403 },
      );
    }

    // 7. comment 정규화 — 빈 문자열 → null
    const normalizedComment =
      comment && comment.trim() !== "" ? comment.trim() : null;

    // 8. $transaction: review upsert + Product 집계 재계산(원자적)
    const review = await prisma.$transaction(async (tx) => {
      const r = await tx.review.upsert({
        where: {
          userId_productId: { userId: session.user.id, productId },
        },
        create: {
          userId: session.user.id,
          productId,
          rating,
          comment: normalizedComment,
        },
        update: {
          rating,
          comment: normalizedComment,
        },
      });
      await recomputeProductRating(tx, productId);
      return r;
    });

    // 9. 캐시 무효화 — 상품 상세 페이지 + 카탈로그 태그
    revalidatePath(`/product/${productId}`);
    revalidateTag("products", {});

    return NextResponse.json({ success: true, data: review }, { status: 201 });
  } catch (error) {
    console.error("[reviews POST] error:", error);
    // P2002: upsert 동시 요청 경쟁 시 unique 충돌 → 409
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, error: "Review already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 },
    );
  }
}

// DELETE: 본인 리뷰 삭제 — 로그인 구매자 전용
// 보안 게이트: auth → 본인 리뷰 존재 확인(없으면 404, 타인 것 자동 unreachable)
// $transaction: review.delete + recomputeProductRating (원자적 집계)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. 인증 게이트 — session.user.id만 신뢰
    // H1: session.user 존재만으론 부족 — id가 undefined인 세션이 게이트 우회 가능
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // 2. URL [id] param
    const { id: productId } = await params;

    // 3. 본인 리뷰 소유 확인 — userId_productId 복합키로 본인 행만 조회 가능
    // 타인 리뷰는 이 where로 조회 불가(= 자동 소유 검증) → 없으면 404
    const existing = await prisma.review.findUnique({
      where: { userId_productId: { userId: session.user.id, productId } },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "리뷰를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // 4. $transaction: review.delete + Product 집계 재계산(원자적)
    await prisma.$transaction(async (tx) => {
      await tx.review.delete({
        where: { userId_productId: { userId: session.user.id, productId } },
      });
      await recomputeProductRating(tx, productId);
    });

    // 5. 캐시 무효화 — 상품 상세 페이지 + 카탈로그 태그
    revalidatePath(`/product/${productId}`);
    revalidateTag("products", {});

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[reviews DELETE] error:", error);
    // P2002: 동시 요청 경쟁 시 unique 충돌 → 409
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, error: "Review already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 },
    );
  }
}
