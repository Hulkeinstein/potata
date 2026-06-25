import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { OrderItemSnapshot } from "@/types";

/**
 * 리뷰 변경(작성/수정/삭제) 시 Product.rating(평균)·reviewCount를 재집계한다.
 * 반드시 $transaction 콜백 안에서 호출 — tx를 받아 같은 트랜잭션에 참여(원자성·레이스 방지).
 * 매번 전체 aggregate로 재계산(증분 running-average 금지 — 부동소수 오차/레이스).
 */
export async function recomputeProductRating(
  tx: Prisma.TransactionClient,
  productId: string,
): Promise<void> {
  const agg = await tx.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const count = agg._count._all;        // 전체 리뷰 수
  const avg = agg._avg.rating;          // null이면 리뷰 0건
  // 리뷰 0건이면 rating null(isBest false), 있으면 소수1자리 반올림
  const rating =
    count === 0 || avg == null ? null : Math.round(avg * 10) / 10;
  await tx.product.update({
    where: { id: productId },
    data: { rating, reviewCount: count },
  });
}

/**
 * 구매자 권한 판정 — 유저가 해당 상품을 주문한 적 있는가.
 * ADR-004: Order.items는 Json 컬럼(관계형 OrderItem 없음)이라 Prisma where로 직접 필터 불가
 * → 유저 Order를 fetch 후 JS로 items 배열에서 productId 포함 여부 판정(유일 경로).
 * 결제 게이트웨이 미연동 → status 무관(PENDING 포함) "해당 상품 포함 주문 보유 = 구매" 간주.
 */
export async function hasPurchasedProduct(
  userId: string,
  productId: string,
): Promise<boolean> {
  const orders = await prisma.order.findMany({
    where: { userId },
    select: { items: true },
  });
  return orders.some((o) =>
    (o.items as unknown as OrderItemSnapshot[]).some(
      (s) => s.productId === productId,
    ),
  );
}
