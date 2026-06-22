import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractErrorMessage } from "@/lib/auth";
import type { RecentAddRequest } from "@/types";

const MAX_RECENTS = 20;

// GET: 본인 최근 try-on 상품 productId 목록(최신순, 최대 20)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const rows = await prisma.recentTryOn.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: MAX_RECENTS,
      select: { productId: true },
    });

    return NextResponse.json(
      { success: true, data: { productIds: rows.map((r) => r.productId) } },
      { status: 200 }
    );
  } catch (error) {
    console.error("[recents GET] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}

// POST: 최근 목록에 추가/갱신 — 이미 있으면 맨 앞으로(createdAt 갱신), 20개 초과분은 정리
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

    const body = (await req.json()) as Partial<RecentAddRequest>;
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    if (!productId) {
      return NextResponse.json(
        { success: false, error: "productId가 필요합니다." },
        { status: 400 }
      );
    }

    // 존재하는 상품만 허용(FK 위반을 사용자 친화 400으로 선차단)
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

    // 이미 있으면 createdAt 갱신(맨 앞 이동), 없으면 생성
    await prisma.recentTryOn.upsert({
      where: { userId_productId: { userId, productId } },
      update: { createdAt: new Date() },
      create: { userId, productId },
    });

    // 20개 초과분(가장 오래된 것) 정리
    const extras = await prisma.recentTryOn.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: MAX_RECENTS,
      select: { id: true },
    });
    if (extras.length > 0) {
      await prisma.recentTryOn.deleteMany({
        where: { id: { in: extras.map((e) => e.id) } },
      });
    }

    return NextResponse.json(
      { success: true, data: { productId } },
      { status: 200 }
    );
  } catch (error) {
    console.error("[recents POST] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}
