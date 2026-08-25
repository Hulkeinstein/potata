import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { AdminProductForm } from "@/components/admin/AdminProductForm";
import Link from "next/link";

/**
 * 관리자 상품 등록 페이지
 * 서버 컴포넌트에서 이중 게이트(middleware + 서버): flash 방지 및 defense-in-depth.
 */
export default async function NewProductPage() {
  const session = await auth();

  // 비로그인 → 로그인 후 복귀
  if (!session?.user) {
    redirect("/login?callbackUrl=/admin/products/new");
  }

  // 비admin → 홈으로
  if (!isAdmin(session.user.email)) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-black py-12 px-4">
      <div className="mx-auto mb-4 max-w-2xl text-right"><Link href="/admin/benefits" className="text-sm font-semibold text-brand-neon underline">쿠폰·포인트 관리</Link></div>
      <AdminProductForm />
    </main>
  );
}
