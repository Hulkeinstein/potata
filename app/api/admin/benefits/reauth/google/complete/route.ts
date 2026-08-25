import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { verifyGoogleStepUp } from "@/lib/benefits/admin-step-up";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const session = await auth();
  if (!token || !session?.user || !isAdmin(session.user.email)) return NextResponse.redirect(new URL("/admin/benefits?stepUp=failed", request.url));
  const verified = await verifyGoogleStepUp(session.user.id, token);
  return NextResponse.redirect(new URL(verified ? `/admin/benefits?stepUp=${encodeURIComponent(token)}` : "/admin/benefits?stepUp=failed", request.url));
}
