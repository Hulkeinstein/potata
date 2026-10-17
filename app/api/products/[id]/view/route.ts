import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { INTERNAL_ERROR_MESSAGE } from "@/lib/api-errors";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";

const VIEW_WINDOW_MS = 10 * 60 * 1000;
const VIEW_LIMIT_PER_IP = 5;
// 발신지 전체 한도 — 상품 id 를 바꿔 가며 보내는 호출(없는 id 포함)도 막는다. 사람이 10분에 상품 120개를 열어 보는 정도는 넉넉히 허용.
const VIEW_LIMIT_PER_SOURCE = 120;

// POST: 상품 조회수 +1 (public, atomic). HOT 랭킹용.
// 조회수 increment 성공 시 revalidateTag("hot-products")로 HOT 랭킹 캐시만 무효화.
// 카탈로그 rows 캐시("products" 태그)는 건드리지 않음 — 상품 rows 재쿼리 없음.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 조회수는 HOT 배지 순위를 정한다 — 한 발신지가 특정 상품을 반복 호출해 순위를 만들지 못하게 막는다.
    // 막힌 호출도 클라이언트는 fire-and-forget이므로 200으로 조용히 넘긴다.
    // 발신지 전체 버킷을 먼저 본다 — 상품 id 를 무작위로 바꿔 상품별 버킷(공유 저장소의 행)을 계속 만드는 것을 막는다.
    // 키 prefix 를 "view-ip:" 로 따로 둬 상품 id 가 "ip" 여도 상품별 키("view:ip:<ip>")와 겹치지 않는다.
    const ip = clientIp(req);
    if (
      !(await consumeRateLimit(`view-ip:${ip}`, VIEW_LIMIT_PER_SOURCE, VIEW_WINDOW_MS)) ||
      !(await consumeRateLimit(`view:${id}:${ip}`, VIEW_LIMIT_PER_IP, VIEW_WINDOW_MS))
    ) {
      return NextResponse.json({ success: false }, { status: 200 });
    }

    await prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
    // 조회수 증가 성공 → HOT 랭킹 캐시만 즉시 무효화(카탈로그 캐시 thrash 금지)
    // Next.js 15 타입: revalidateTag(tag, profile) — 빈 profile({})로 호출
    revalidateTag("hot-products", {});
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    // 없는 상품 id(P2025) 등은 조회 트래킹 실패로 간주 — 조용히 200(클라 fire-and-forget이라 사용자 영향 없음)
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2025") {
      return NextResponse.json({ success: false }, { status: 200 });
    }
    console.error("[products view POST] error:", error);
    return NextResponse.json({ success: false, error: INTERNAL_ERROR_MESSAGE }, { status: 500 });
  }
}
