import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { updateAdminProductStatus } from "@/lib/admin-product-catalog";
import { readJsonBody, requestBodyErrorResponse } from "@/lib/request-body";

export async function PATCH(request: NextRequest, context: { readonly params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.email)) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const body = await readJsonBody<unknown>(request);
  if (!body.ok) return requestBodyErrorResponse(body.error);
  const input = body.value;
  if (!input || typeof input !== "object" || !("isActive" in input) || typeof input.isActive !== "boolean" || Object.keys(input).some((key) => key !== "isActive")) {
    return NextResponse.json({ success: false, error: "Invalid status update" }, { status: 400 });
  }
  try {
    const { id } = await context.params;
    if (!(await updateAdminProductStatus(id, input.isActive))) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    revalidateTag("products", { expire: 0 });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    console.error("[admin status] update failed");
    return NextResponse.json({ success: false, error: "판매 상태를 변경하지 못했습니다." }, { status: 500 });
  }
}
