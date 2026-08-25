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
