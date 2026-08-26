import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { isAdmin } from "@/lib/admin";

export default async function AdminLayout({ children }: { readonly children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin");
  if (!isAdmin(session.user.email)) redirect("/");
  return <><AdminNav />{children}</>;
}
