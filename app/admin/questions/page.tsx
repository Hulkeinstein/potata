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
