import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractErrorMessage } from "@/lib/auth";
import type { CreateOrderRequest, OrderItemSnapshot } from "@/types";
import type { Prisma } from "@prisma/client";

// 무료 배송 임계값(AED) — 서버 단일 진실 원천, 클라이언트 입력 불신
const FREE_SHIPPING_THRESHOLD = 50000;
const SHIPPING_FEE = 3000;

export async function POST(req: NextRequest) {
  try {
    // 1. 인증 게이트 — 다른 어떤 체크보다 먼저
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. body 파싱 및 기본 구조 검증
    const body = (await req.json()) as Partial<CreateOrderRequest>;
    const { items, idempotencyKey } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "주문 항목이 비어 있습니다." },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (typeof item.productId !== "string" || !item.productId) {
        return NextResponse.json(
          { success: false, error: "유효하지 않은 productId입니다." },
          { status: 400 }
        );
      }
      if (
        typeof item.quantity !== "number" ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
      ) {
        return NextResponse.json(
          { success: false, error: "수량은 1 이상의 정수여야 합니다." },
          { status: 400 }
        );
      }
    }

    // 3. 서버 가격 재검증 — 클라이언트가 보낸 price/name 무시, DB에서 직접 조회
    const snapshots: OrderItemSnapshot[] = [];
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (!product) {
        return NextResponse.json(
          { success: false, error: `존재하지 않는 상품: ${item.productId}` },
          { status: 400 }
        );
      }

      snapshots.push({
        productId: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price, // 서버 조회값만 사용
        imageUrl: product.imageUrl,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
      });
    }

    // 4. 서버 재계산 (Int 전용)
    const subtotal = snapshots.reduce(
      (sum, s) => sum + s.price * s.quantity,
      0
    );
    const shipping = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const total = subtotal + shipping;

    // 5. 멱등성 체크 — idempotencyKey 존재 시 중복 생성 방지
    if (idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return NextResponse.json(
          { success: true, data: existing },
          { status: 200 }
        );
      }
    }

    // 6. 원자적 주문 생성
    const order = await prisma.$transaction(async (tx) => {
      return tx.order.create({
        data: {
          userId: session.user.id,
          items: snapshots as unknown as Prisma.InputJsonValue,
          subtotal,
          shipping,
          total,
          status: "PENDING",
          idempotencyKey: idempotencyKey ?? null,
        },
      });
    });

    return NextResponse.json({ success: true, data: order }, { status: 200 });
  } catch (error) {
    console.error("[orders POST] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // 1. 인증 게이트
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. 본인 주문만 조회 — session.user.id 사용, 쿼리파라미터 userId 불신
    const orders = await prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: orders }, { status: 200 });
  } catch (error) {
    console.error("[orders GET] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}
