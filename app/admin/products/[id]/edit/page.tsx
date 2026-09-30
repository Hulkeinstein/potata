// 관리자 화면은 항상 현재 DB 상태를 보여야 한다 — 정적 생성되면 수치가 빌드 시점에 굳어 재배포 전까지 갱신되지 않는다.
export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { getAdminProduct } from "@/lib/admin-product-catalog";
import { AdminProductEditForm } from "@/components/admin/AdminProductEditForm";

export default async function EditProductPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");
  const { id } = await params;
  const product = await getAdminProduct(id);
  if (!product) notFound();
  return <main className="min-h-screen bg-black px-4 py-12 text-white"><AdminProductEditForm product={product} /></main>;
}
