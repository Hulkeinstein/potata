import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { startGoogleStepUp } from "@/lib/benefits/admin-step-up";

export async function POST() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.email)) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const token = await startGoogleStepUp(session.user.id);
  return NextResponse.json({ success: true, data: { token } });
}
