import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { extractErrorMessage } from "@/lib/auth";
import { recomputeProductRating, hasPurchasedProduct } from "@/lib/reviews";
import type { Review, ReviewListResponse } from "@/types";
import { isAdmin } from "@/lib/admin";
import { uploadReviewImage, removeReviewImagesByUrl } from "@/lib/supabase-storage";
import {
  MAX_IMAGE_SIZE,
  MAX_REVIEW_IMAGES,
  sniffImage,
} from "@/lib/image-validation";

// sniffed ext → MIME 매핑 (공격자 제어 file.type 대신 바이트 기반 ext에서 파생)
const EXT_TO_MIME: Record<"jpg" | "png" | "webp", string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

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
          imageUrls: true,
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
      imageUrls: r.imageUrls,
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

// POST: 리뷰 작성·수정(upsert) — 로그인 구매자 전용 (admin 우회 가능)
// 보안 게이트: auth → 파싱 → rating/comment 검증 → 상품 존재 → (admin OR 구매자) 게이트
// 이미지: keepImageUrls(유지 기존 URL) + images(새 파일) → 보안 필터(prevUrls∩keep) → 업로드(트랜잭션 밖) → $transaction(finalImageUrls) → 제거분 삭제
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

    // 3. multipart 파싱 — 파싱 실패 시 400
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }
    const rating = Number(form.get("rating"));
    const commentRaw = form.get("comment");
    const comment = typeof commentRaw === "string" ? commentRaw : null;
    const files = form
      .getAll("images")
      .filter((f): f is File => f instanceof File);
    // keepImageUrls: 클라가 "유지할 기존 URL" 목록으로 전송 — 서버에서 본인 것만 필터
    const keepImageUrls = form
      .getAll("keepImageUrls")
      .filter((v): v is string => typeof v === "string");

    // 4. rating 검증(정수 1~5)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "rating은 1~5 사이 정수여야 합니다." },
        { status: 400 },
      );
    }

    // 4-b. comment 타입/길이 검증 — 존재하면 string + 최대 2000자
    if (comment !== null) {
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

    // 6. 권한 게이트 — admin 우회 OR 구매자
    if (
      !isAdmin(session.user.email) &&
      !(await hasPurchasedProduct(session.user.id, productId))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "해당 상품을 구매한 사용자만 리뷰를 작성할 수 있습니다.",
        },
        { status: 403 },
      );
    }

    // 7. 이미지 개수 검증 — kept(유지) + 신규 파일 총합 ≤ MAX_REVIEW_IMAGES
    if (keepImageUrls.length + files.length > MAX_REVIEW_IMAGES) {
      return NextResponse.json(
        { success: false, error: `이미지는 최대 ${MAX_REVIEW_IMAGES}장` },
        { status: 400 },
      );
    }
    // 검증과 동시에 ArrayBuffer를 수집(sniff + upload에서 동일 buf 재사용)
    const validated: { file: File; buf: ArrayBuffer; ext: "jpg" | "png" | "webp" }[] = [];
    for (const f of files) {
      if (f.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { success: false, error: "이미지는 5MB 이하여야 합니다." },
          { status: 400 },
        );
      }
      const buf = await f.arrayBuffer();
      const ext = sniffImage(buf);
      if (!ext) {
        return NextResponse.json(
          { success: false, error: "유효한 이미지가 아닙니다." },
          { status: 400 },
        );
      }
      validated.push({ file: f, buf, ext });
    }

    // 8. 기존 imageUrls 조회 — kept 보안 필터 + 차집합 계산용
    const prev = await prisma.review.findUnique({
      where: { userId_productId: { userId: session.user.id, productId } },
      select: { imageUrls: true },
    });
    const prevUrls = prev?.imageUrls ?? [];

    // 8-b. kept(보안 필터) — 클라가 보낸 keepImageUrls 중 본인 기존 것만 허용
    // 임의 URL 주입 차단: prevUrls ∩ keepImageUrls 만 신뢰
    const kept = [...new Set(keepImageUrls.filter((u) => prevUrls.includes(u)))];

    // 9. 이미지 업로드 — $transaction 밖 / 부분 실패 시 업로드 완료분 보상 삭제
    const uploaded: string[] = [];
    try {
      for (const it of validated) {
        const { publicUrl } = await uploadReviewImage(session.user.id, {
          data: it.buf,
          contentType: EXT_TO_MIME[it.ext],
          ext: it.ext,
        });
        uploaded.push(publicUrl);
      }
    } catch (e) {
      // 업로드 도중 실패 — 완료된 것만 정리 후 re-throw(최상위 catch → 500)
      await removeReviewImagesByUrl(uploaded).catch(() => {});
      throw e;
    }

    // 10. comment 정규화 — 빈 문자열 → null
    const normalizedComment =
      comment && comment.trim() !== "" ? comment.trim() : null;

    // 10-b. 최종 imageUrls 결정 — 유지분(kept) + 신규 업로드분(uploaded)
    // 신규 리뷰: prevUrls=[] → kept=[] → finalImageUrls=uploaded
    // 수정(keep 전체): kept=prevUrls → finalImageUrls=prevUrls(기존 유지)
    // 수정(일부 제거): kept=부분집합 → removed=prevUrls∖kept → Storage 삭제
    const finalImageUrls = [...kept, ...uploaded];

    // 11. $transaction: review upsert(imageUrls 포함) + Product 집계 재계산(원자적)
    // DB 실패 시 신규 업로드분(uploaded)만 보상 삭제 — 기존 kept는 건드리지 않음
    let review;
    try {
      review = await prisma.$transaction(async (tx) => {
        const r = await tx.review.upsert({
          where: {
            userId_productId: { userId: session.user.id, productId },
          },
          create: {
            userId: session.user.id,
            productId,
            rating,
            comment: normalizedComment,
            imageUrls: finalImageUrls,
          },
          update: {
            rating,
            comment: normalizedComment,
            imageUrls: finalImageUrls,
          },
        });
        await recomputeProductRating(tx, productId);
        return r;
      });
    } catch (e) {
      // DB 실패 보상: 신규 업로드분만 삭제(kept는 기존 것 — Storage에서 지우면 안 됨)
      await removeReviewImagesByUrl(uploaded).catch(() => {});
      throw e;
    }

    // 12. 제거분 삭제 — DB 커밋 후(트랜잭션 밖) 실행
    // removed = 기존∖kept = 사용자가 명시적으로 제거한 이전 이미지
    // DB 커밋 전 삭제 금지: 롤백 시 기존 이미지 유실 방지
    const removed = prevUrls.filter((u) => !kept.includes(u));
    await removeReviewImagesByUrl(removed).catch(() => {});

    // 13. 캐시 무효화 — 상품 상세 페이지 + 카탈로그 태그
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
    // imageUrls도 함께 조회 — 삭제 후 Storage 정리에 필요
    const existing = await prisma.review.findUnique({
      where: { userId_productId: { userId: session.user.id, productId } },
      select: { id: true, imageUrls: true },
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

    // 5. Storage 이미지 전량 정리 — $transaction 성공 후(밖) 실행, 실패 무시(정리 실패가 응답 실패로 전파되지 않도록)
    await removeReviewImagesByUrl(existing.imageUrls).catch(() => {});

    // 6. 캐시 무효화 — 상품 상세 페이지 + 카탈로그 태그
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
