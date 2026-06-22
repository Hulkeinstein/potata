import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProductById } from "@/lib/products";
import { extractErrorMessage } from "@/lib/auth";
import type { CartItem, CartSyncRequest } from "@/types";

// GET: 본인 장바구니 — productId로 현재 product/가격을 재조회(Zero Trust). 삭제/품절 상품은 제외.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const rows = await prisma.cartItem.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });

    const items: CartItem[] = [];
    for (const row of rows) {
      const product = await getProductById(row.productId); // 서버 재조회값만 신뢰
      if (!product) continue; // 삭제/품절 상품 제외
      items.push({
        product,
        quantity: row.quantity,
        size: row.size || undefined, // "" → undefined (앱 CartItem 타입 정합)
        color: row.color || undefined,
      });
    }

    return NextResponse.json({ success: true, data: { items } }, { status: 200 });
  } catch (error) {
    console.error("[cart GET] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}

// PUT: 본인 장바구니 전체 동기화 — 클라 라인 배열을 서버가 검증·정규화 후 교체.
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    const body = (await req.json()) as Partial<CartSyncRequest>;
    if (!Array.isArray(body.items)) {
      return NextResponse.json(
        { success: false, error: "items 배열이 필요합니다." },
        { status: 400 }
      );
    }

    // 검증 + 정규화(size/color "" 정규화) + 동일 (productId,size,color) 수량 합산
    // (중복 라인이 @@unique를 위반하지 않도록 서버에서 병합)
    const merged = new Map<string, { productId: string; size: string; color: string; quantity: number }>();
    for (const it of body.items) {
      const productId = typeof it?.productId === "string" ? it.productId.trim() : "";
      const size = typeof it?.size === "string" ? it.size : "";
      const color = typeof it?.color === "string" ? it.color : "";
      const quantity = Number(it?.quantity);
      if (!productId || !Number.isInteger(quantity) || quantity < 1) {
        return NextResponse.json(
          { success: false, error: "각 항목은 productId와 1 이상 정수 quantity가 필요합니다." },
          { status: 400 }
        );
      }
      const key = `${productId}|${size}|${color}`;
      const prev = merged.get(key);
      merged.set(key, { productId, size, color, quantity: (prev?.quantity ?? 0) + quantity });
    }

    let lines = [...merged.values()];

    // 존재하는 상품만 저장(삭제된 상품 라인 무시 — FK 위반 방지)
    if (lines.length > 0) {
      const ids = [...new Set(lines.map((l) => l.productId))];
      const existing = await prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true },
      });
      const existingSet = new Set(existing.map((p) => p.id));
      lines = lines.filter((l) => existingSet.has(l.productId));
    }

    // 전체 교체(트랜잭션): 본인 cart 비우고 새로 생성
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { userId } }),
      ...(lines.length > 0
        ? [prisma.cartItem.createMany({ data: lines.map((l) => ({ userId, ...l })) })]
        : []),
    ]);

    return NextResponse.json({ success: true, data: { count: lines.length } }, { status: 200 });
  } catch (error) {
    console.error("[cart PUT] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}
