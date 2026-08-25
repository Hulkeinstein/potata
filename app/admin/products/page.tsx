import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { listAdminProducts, parseAdminCatalogQuery } from "@/lib/admin-product-catalog";
import { AdminProductCatalogClient } from "@/components/admin/AdminProductCatalogClient";

export default async function AdminProductsPage({ searchParams }: { readonly searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin/products");
  if (!isAdmin(session.user.email)) redirect("/");
  const params = await searchParams;
  const query = new URLSearchParams();
  if (typeof params.q === "string") query.set("q", params.q);
  if (typeof params.page === "string") query.set("page", params.page);
  return <main className="min-h-screen bg-black px-4 py-12 text-white"><AdminProductCatalogClient initialData={await listAdminProducts(parseAdminCatalogQuery(query))} /></main>;
}
