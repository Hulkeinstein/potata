import Link from "next/link";
import { OperationsIssueList } from "@/components/admin/OperationsIssueList";
import { listOperationsIssues } from "@/lib/operations-assistant";
import type { OperationIssue } from "@/types/operations-assistant";

type OperationsPageState =
  | { readonly status: "ready"; readonly issues: readonly OperationIssue[] }
  | { readonly status: "error" };

async function getOperationsPageState(): Promise<OperationsPageState> {
  try {
    return { status: "ready", issues: await listOperationsIssues() };
  } catch {
    return { status: "error" };
  }
}

export default async function AdminOperationsPage() {
  const state = await getOperationsPageState();

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <Link href="/admin" className="text-sm text-zinc-400 underline hover:text-white">운영 홈으로 돌아가기</Link>
          <h1 className="mt-4 text-3xl font-black">운영 어시스턴트</h1>
          {state.status === "ready" && <p className="mt-2 text-sm text-zinc-400">자동 변경 없이 실제 운영 이슈와 기존 해결 화면만 안내합니다.</p>}
        </header>
        {state.status === "ready" ? (
          <>
            <p className="text-sm text-zinc-400">확인할 운영 이슈 {state.issues.length}개</p>
            <OperationsIssueList issues={state.issues} />
          </>
        ) : (
          <>
            <section role="alert" className="rounded border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">운영 이슈를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</section>
            <Link href="/admin/operations" className="inline-block text-sm font-semibold underline underline-offset-4 hover:text-brand-neon">다시 시도</Link>
          </>
        )}
      </div>
    </main>
  );
}
