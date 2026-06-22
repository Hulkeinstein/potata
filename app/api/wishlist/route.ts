import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractErrorMessage } from "@/lib/auth";
import type { WishlistToggleRequest } from "@/types";

// GET: 본인 위시리스트 productId 목록 (session.user.id만 신뢰)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const rows = await prisma.wishlistItem.findMany({
      where: { userId: session.user.id },
      select: { productId: true },
    });

    return NextResponse.json(
      { success: true, data: { productIds: rows.map((r) => r.productId) } },
      { status: 200 }
    );
  } catch (error) {
    console.error("[wishlist GET] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}

// POST: 좋아요 토글(멱등) — 있으면 삭제(liked:false), 없으면 생성(liked:true)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    const body = (await req.json()) as Partial<WishlistToggleRequest>;
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    if (!productId) {
      return NextResponse.json(
        { success: false, error: "productId가 필요합니다." },
        { status: 400 }
      );
    }

    // 존재하는 상품만 허용 — FK 위반(P2003)을 사용자 친화 400으로 선차단
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json(
        { success: false, error: "존재하지 않는 상품입니다." },
        { status: 400 }
      );
    }

    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      await prisma.wishlistItem.delete({ where: { id: existing.id } });
      return NextResponse.json(
        { success: true, data: { productId, liked: false } },
        { status: 200 }
      );
    }

    // 멀티탭/연타 경쟁 시 unique 충돌은 skipDuplicates로 멱등 흡수(liked:true로 수렴)
    await prisma.wishlistItem.createMany({
      data: [{ userId, productId }],
      skipDuplicates: true,
    });
    return NextResponse.json(
      { success: true, data: { productId, liked: true } },
      { status: 200 }
    );
  } catch (error) {
    console.error("[wishlist POST] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}
