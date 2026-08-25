import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { getAdminProduct, updateAdminProduct } from "@/lib/admin-product-catalog";

const CATEGORIES = new Set(["Outer", "Top", "Bottom", "Dress", "Acc", "Shoes"]);

function parseUpdate(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const brand = typeof body.brand === "string" ? body.brand.trim() : "";
  const category = typeof body.category === "string" ? body.category : "";
  const price = body.price;
  const isActive = body.isActive;
  const originalPrice = body.originalPrice === null ? null : body.originalPrice;
  const discountRate = body.discountRate === null ? null : body.discountRate;
  const description = body.description === null ? null : typeof body.description === "string" ? body.description.trim() || null : null;
  const variants: { id: string; stock: number; isManuallySoldOut: boolean }[] = [];
  if (body.variants !== undefined && !Array.isArray(body.variants)) return null;
  for (const value of body.variants ?? []) {
    if (!value || typeof value !== "object") return null;
    const variant = value as Record<string, unknown>;
    if (typeof variant.id !== "string" || typeof variant.stock !== "number" || !Number.isInteger(variant.stock) || variant.stock < 0 || typeof variant.isManuallySoldOut !== "boolean") return null;
    variants.push({ id: variant.id, stock: variant.stock, isManuallySoldOut: variant.isManuallySoldOut });
  }
  if (!name || !brand || !CATEGORIES.has(category) || typeof price !== "number" || !Number.isInteger(price) || price <= 0 || typeof isActive !== "boolean") return null;
  if (originalPrice !== null && (typeof originalPrice !== "number" || !Number.isInteger(originalPrice) || originalPrice <= 0 || originalPrice < price)) return null;
  if (discountRate !== null && (typeof discountRate !== "number" || !Number.isInteger(discountRate) || discountRate < 0 || discountRate > 100)) return null;
  return { name, brand, category, price, isActive, originalPrice, discountRate, description, ...(body.variants !== undefined ? { variants } : {}) };
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  return isAdmin(session.user.email) ? session : null;
}

export async function GET(_: NextRequest, context: RouteContext<"/api/admin/catalog/[id]">) {
  if (!(await requireAdmin())) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const product = await getAdminProduct(id);
  return product ? NextResponse.json({ success: true, data: product }) : NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
}

export async function PATCH(request: NextRequest, context: RouteContext<"/api/admin/catalog/[id]">) {
  if (!(await requireAdmin())) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const input = parseUpdate(await request.json());
  if (!input) return NextResponse.json({ success: false, error: "Invalid product update" }, { status: 400 });
  const { id } = await context.params;
  const product = await updateAdminProduct(id, input);
  if (!product) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  revalidateTag("products", {});
  return NextResponse.json({ success: true, data: product });
}
