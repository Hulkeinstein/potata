import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // /admin: 로그인 + admin 권한(allowlist) 둘 다 필요. UX 게이트.
  // 참고: API 라우트는 Zero Trust 원칙에 따라 /api/admin 에서도 자체 재검증(PR2).
  if (nextUrl.pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdmin(req.auth?.user?.email)) {
      return NextResponse.redirect(new URL("/", nextUrl.origin));
    }
  }

  // 보호 라우트 목록 (로그인만 필요)
  const protectedPaths = ["/mypage", "/liked"];
  const isProtected = protectedPaths.some((path) =>
    nextUrl.pathname.startsWith(path)
  );

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/mypage/:path*", "/liked/:path*", "/admin", "/admin/:path*"],
};
