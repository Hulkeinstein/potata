// 관리자 화면은 항상 현재 DB 상태를 보여야 한다 — 정적 생성되면 수치가 빌드 시점에 굳어 재배포 전까지 갱신되지 않는다.
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminQuestionsInbox } from "@/components/admin/AdminQuestionsInbox";
import { isAdmin } from "@/lib/admin";
import { listAdminQuestions, parseAdminQuestionQuery } from "@/lib/admin-questions";

export default async function AdminQuestionsPage({ searchParams }: { readonly searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin/questions");
  if (!isAdmin(session.user.email)) redirect("/");
  const source = await searchParams;
  const params = new URLSearchParams();
  if (typeof source.status === "string") params.set("status", source.status);
  if (typeof source.q === "string") params.set("q", source.q);
  if (typeof source.page === "string") params.set("page", source.page);
  const query = parseAdminQuestionQuery(params);
  return <main className="min-h-screen bg-black px-4 py-10 text-white"><AdminQuestionsInbox initialData={await listAdminQuestions(query)} initialStatus={query.status} initialQuery={query.query} /></main>;
}
