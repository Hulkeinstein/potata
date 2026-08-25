import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractErrorMessage } from "@/lib/auth";
import type { CreateOrderRequest, OrderItemSnapshot } from "@/types";
import type { Prisma } from "@prisma/client";
import { findPurchasableVariant, getVariantLabel } from "@/lib/product-variants";

// 무료 배송 임계값(AED) — 서버 단일 진실 원천, 클라이언트 입력 불신
const FREE_SHIPPING_THRESHOLD = 50000;
const SHIPPING_FEE = 3000;

type OrderLine = {
  readonly productId: string;
  readonly quantity: number;
  readonly size: string;
  readonly color: string;
};

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

    const merged = new Map<string, OrderLine>();
    for (const item of items) {
      const size = item.size ?? "";
      const color = item.color ?? "";
      const key = `${item.productId}\u0000${size}\u0000${color}`;
      const previous = merged.get(key);
      merged.set(key, { productId: item.productId, size, color, quantity: (previous?.quantity ?? 0) + item.quantity });
    }
    const lines = [...merged.values()];

    // 5. 멱등성 체크 — idempotencyKey 존재 시 중복 생성 방지
    if (idempotencyKey) {
      const existing = await prisma.order.findFirst({
        where: { idempotencyKey, userId: session.user.id },
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
      const products = await tx.product.findMany({
        where: { id: { in: lines.map((line) => line.productId) }, isActive: true },
        include: { variants: true },
      });
      const productById = new Map(products.map((product) => [product.id, product]));
      const snapshots: OrderItemSnapshot[] = [];
      for (const line of lines) {
        const product = productById.get(line.productId);
        if (!product) throw new InventoryUnavailableError(`존재하지 않는 상품: ${line.productId}`, 400);
        const variant = findPurchasableVariant(product.variants, line);
        if (!variant) throw new InventoryUnavailableError(`${getVariantLabel(line)} 옵션은 품절되었습니다.`);
        const decremented = await tx.productVariant.updateMany({
          where: { id: variant.id, stock: { gte: line.quantity }, isManuallySoldOut: false },
          data: { stock: { decrement: line.quantity } },
        });
        if (decremented.count !== 1) throw new InventoryUnavailableError(`${getVariantLabel(line)} 옵션은 재고가 부족합니다.`);
        snapshots.push({ productId: product.id, name: product.name, brand: product.brand, price: product.price, imageUrl: product.imageUrl, size: line.size, color: line.color, quantity: line.quantity });
      }
      const subtotal = snapshots.reduce((sum, snapshot) => sum + snapshot.price * snapshot.quantity, 0);
      const shipping = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
      const total = subtotal + shipping;
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
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({ success: true, data: order }, { status: 200 });
  } catch (error) {
    if (error instanceof InventoryUnavailableError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    console.error("[orders POST] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}

class InventoryUnavailableError extends Error {
  constructor(message: string, readonly status = 409) {
    super(message);
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
