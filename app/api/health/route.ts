import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

// 외부 uptime 모니터·배포 smoke(scripts/smoke.ts)용 상태 확인. 인증·개인정보·환경값을 응답에 싣지 않는다.
// 계획: docs/work-plans/health-smoke.md
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "ok" }, { headers: NO_STORE });
  } catch (error) {
    // 오류 내용(호스트·자격 증명 힌트 등)은 응답에 싣지 않고 서버 로그에만 남긴다.
    console.error("[health] DB 확인 실패", error);
    return NextResponse.json({ ok: false, db: "error" }, { status: 503, headers: NO_STORE });
  }
}
