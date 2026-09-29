import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { startGoogleStepUp } from "@/lib/benefits/admin-step-up";
import { STEP_UP_COOKIE, STEP_UP_COOKIE_MAX_AGE_SEC } from "@/lib/benefits/google-reauth";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.email)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  const token = await startGoogleStepUp(session.user.id);

  // proof는 응답 본문·주소창이 아니라 httpOnly 쿠키로만 오간다 —
  // 주소창에 실으면 브라우저 기록·Referer·중계 로그에 남는다.
  const response = NextResponse.json({ success: true });
  response.cookies.set(STEP_UP_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax", // Google에서 돌아오는 top-level 이동에도 쿠키가 실려야 한다
    secure: process.env.NODE_ENV === "production",
    path: "/api/admin",
    maxAge: STEP_UP_COOKIE_MAX_AGE_SEC,
  });
  return response;
}
