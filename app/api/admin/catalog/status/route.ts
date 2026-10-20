import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { updateAdminProductStatuses } from "@/lib/admin-product-catalog";
import { parseProductStatusBatch } from "@/lib/admin-product-status-input";
import { readJsonBody, requestBodyErrorResponse } from "@/lib/request-body";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.email)) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const body = await readJsonBody<unknown>(request);
  if (!body.ok) return requestBodyErrorResponse(body.error);
  const input = parseProductStatusBatch(body.value);
  if (!input) return NextResponse.json({ success: false, error: "상품 선택과 판매 상태를 확인해 주세요." }, { status: 400 });
  let processed: number;
  try {
    processed = await updateAdminProductStatuses(input.ids, input.isActive);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    console.error("[admin bulk status] update failed");
    return NextResponse.json({ success: false, error: "판매 상태를 처리하지 못했습니다. 목록을 새로고침해 현재 상태를 확인해 주세요." }, { status: 500 });
  }
  if (processed === 0) return NextResponse.json({ success: false, error: "선택한 상품 일부를 찾을 수 없습니다. 목록을 새로고침해 주세요." }, { status: 404 });
  try {
    revalidateTag("products", { expire: 0 });
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    console.error("[admin bulk status] cache invalidation failed after commit");
    return NextResponse.json({ success: true, processed, warning: "상태는 저장됐지만 고객 화면 갱신이 지연될 수 있습니다. 목록을 새로고침해 확인해 주세요." });
  }
  return NextResponse.json({ success: true, processed });
}
