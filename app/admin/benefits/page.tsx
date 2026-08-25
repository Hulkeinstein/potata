import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { AdminBenefitsClient } from "@/components/benefits/AdminBenefitsClient";
import { listAdminBenefits } from "@/lib/benefits/admin-service";
import { prisma } from "@/lib/prisma";

export default async function AdminBenefitsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin/benefits");
  if (!isAdmin(session.user.email)) redirect("/");
  const [data, user] = await Promise.all([listAdminBenefits(), prisma.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } })]);
  return <main className="min-h-screen bg-black px-5 pb-24 pt-20 text-white"><div className="mx-auto max-w-4xl"><div className="mb-8 flex items-center justify-between"><div><h1 className="text-3xl font-black">Benefits Management</h1><p className="mt-2 text-zinc-400">쿠폰·포인트 pilot 감사 기록</p></div><Link href="/admin/products/new" className="text-sm text-brand-neon underline">상품 등록</Link></div><AdminBenefitsClient initialData={{ ...data, reauthMethod: user?.passwordHash ? "PASSWORD" : "GOOGLE" }} /></div></main>;
}
