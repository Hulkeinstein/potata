import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { listAdminProducts, parseAdminCatalogQuery } from "@/lib/admin-product-catalog";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.email)) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ success: true, data: await listAdminProducts(parseAdminCatalogQuery(request.nextUrl.searchParams)) });
}
