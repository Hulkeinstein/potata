import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { validateHandle } from "@/lib/handle";
import { extractErrorMessage } from "@/lib/auth";

/**
 * PATCH /api/users/me/handle
 *
 * 본인 handle 설정 (null→set). actor=session.user.id 고정 — body userId 무시(IDOR 차단).
 * Zero Trust: client validateHandle 결과 신뢰 금지 → 서버 재검증.
 * unique 선행 체크 + P2002 catch: 경쟁 조건 최종 방어.
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // actor는 반드시 session에서만 — body의 userId를 절대 읽지 않음(IDOR 방어)
    const actorId = session.user.id;

    const body = (await req.json()) as { handle?: unknown };

    // 서버 재검증 — 클라이언트 입력 신뢰 금지(Zero Trust)
    const validation = validateHandle(String(body.handle ?? ""));
    if (!validation.ok) {
      return NextResponse.json(
        { success: false, error: `핸들: ${validation.error}` },
        { status: 400 }
      );
    }
    const handle = validation.value;

    // null→set 1회 제한: 이미 handle이 있으면 rename 차단(squat 표면 축소)
    const me = await prisma.user.findUnique({ where: { id: actorId }, select: { handle: true } });
    if (me?.handle) {
      return NextResponse.json(
        { success: false, error: "핸들은 이미 설정되어 변경할 수 없습니다." },
        { status: 409 }
      );
    }

    // handle unique 선행 체크 — 이 시점에 본인 handle은 null이므로 hit=타인 점유
    const existingHandle = await prisma.user.findUnique({
      where: { handle },
      select: { id: true },
    });
    if (existingHandle) {
      return NextResponse.json(
        { success: false, error: "이미 사용 중인 핸들입니다." },
        { status: 409 }
      );
    }

    await prisma.user.update({
      where: { id: actorId }, // actor=session만 — IDOR 차단
      data: { handle },
    });

    return NextResponse.json({ success: true, data: { handle } });
  } catch (error) {
    // Prisma unique 제약 위반(P2002) — 동시 요청 경쟁 최종 방어
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, error: "이미 사용 중인 핸들입니다." },
        { status: 409 }
      );
    }
    console.error("[me/handle PATCH] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/users/me/handle
 *
 * 본인 handle 조회. JWT에 handle이 없으므로 DB에서 직접 읽음.
 * 배너가 handle null 판정에 사용.
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { handle: true },
    });

    return NextResponse.json({ success: true, data: { handle: user?.handle ?? null } });
  } catch (error) {
    console.error("[me/handle GET] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}
