import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOwnedBenefits } from "@/lib/benefits/read-service";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const cursor = new URL(request.url).searchParams.get("cursor") ?? undefined;
  try {
    return NextResponse.json({ success: true, data: await getOwnedBenefits(session.user.id, cursor) });
  } catch (error) {
    console.error("[owned benefits] error", error);
    return NextResponse.json({ success: false, error: "Benefits could not be loaded" }, { status: 500 });
  }
}
