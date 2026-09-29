import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { verifyGoogleStepUp } from "@/lib/benefits/admin-step-up";
import { isFreshGoogleAuth, STEP_UP_COOKIE } from "@/lib/benefits/google-reauth";

/**
 * Google 재인증 복귀 지점. NextAuth가 Google 로그인(prompt=login, max_age=0)을 마친 뒤 여기로 돌아온다.
 *
 * 세션이 살아 있다는 것만으로는 통과시키지 않는다 — 세션 쿠키를 탈취한 사람에게도 관문이 열리기 때문이다.
 * 이번 요청의 세션이 "방금 Google 인증을 통과한 세션"인지(googleAuthTime)까지 확인한 뒤에만 proof를 유효화한다.
 */
export async function GET(request: Request) {
  const failed = NextResponse.redirect(new URL("/admin/benefits?stepUp=failed", request.url));

  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.email)) return failed;

  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${STEP_UP_COOKIE}=`))
    ?.slice(STEP_UP_COOKIE.length + 1);
  if (!token) return failed;

  if (!isFreshGoogleAuth(session.googleAuthTime, Date.now())) return failed;
  if (!(await verifyGoogleStepUp(session.user.id, decodeURIComponent(token)))) return failed;

  // proof 값은 계속 쿠키에만 있고, 주소창에는 성공 여부만 싣는다.
  return NextResponse.redirect(new URL("/admin/benefits?stepUp=done", request.url));
}
