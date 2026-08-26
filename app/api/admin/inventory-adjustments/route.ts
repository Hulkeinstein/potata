import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { parseInventoryAdjustmentInput } from "@/lib/inventory-adjustment-contract";
import { adjustInventory, InventoryAdjustmentError, listVariantInventoryAdjustments } from "@/lib/inventory-adjustment-service";

async function adminId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id && isAdmin(session.user.email) ? session.user.id : null;
}

export async function GET(request: NextRequest) {
  if (!(await adminId())) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const variantId = request.nextUrl.searchParams.get("variantId")?.trim();
  if (!variantId) return NextResponse.json({ success: false, error: "variantId is required" }, { status: 400 });
  return NextResponse.json({ success: true, data: await listVariantInventoryAdjustments(variantId, request.nextUrl.searchParams.get("cursor") ?? undefined) });
}

export async function POST(request: NextRequest) {
  const actorId = await adminId();
  if (!actorId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  try {
    const parsed = parseInventoryAdjustmentInput(await request.json());
    if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    return NextResponse.json({ success: true, data: await adjustInventory(actorId, parsed.value) });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    if (error instanceof InventoryAdjustmentError) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    console.error("[admin inventory adjustment] error", error);
    return NextResponse.json({ success: false, error: "Inventory adjustment failed" }, { status: 500 });
  }
}
