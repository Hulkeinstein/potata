import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { listAdminQuestions, parseAdminQuestionQuery } from "@/lib/admin-questions";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.email)) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const query = parseAdminQuestionQuery(new URL(request.url).searchParams);
  return NextResponse.json({ success: true, data: await listAdminQuestions(query) });
}
