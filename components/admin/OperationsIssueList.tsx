import Link from "next/link";
import type { OperationIssue, OperationIssueSeverity } from "@/types/operations-assistant";

type OperationsIssueListProps = {
  readonly issues: readonly OperationIssue[];
};

function severityLabel(severity: OperationIssueSeverity): string {
  switch (severity) {
    case "immediate":
      return "즉시 확인";
    case "warning":
      return "주의";
    case "info":
      return "정보";
  }
}

function severityClassName(severity: OperationIssueSeverity): string {
  switch (severity) {
    case "immediate":
      return "border-red-800 bg-red-950/40 text-red-200";
    case "warning":
      return "border-amber-800 bg-amber-950/40 text-amber-200";
    case "info":
      return "border-sky-800 bg-sky-950/40 text-sky-200";
  }
}

export function OperationsIssueList({ issues }: OperationsIssueListProps) {
  if (issues.length === 0) {
    return <section aria-label="운영 이슈 목록" className="rounded border border-zinc-800 bg-zinc-950 px-4 py-16 text-center text-zinc-300">현재 확인이 필요한 운영 이슈가 없습니다.</section>;
  }

  return <section aria-label="운영 이슈 목록" className="space-y-3">
    {issues.map((issue) => <article key={`${issue.kind}-${issue.targetId}`} className="rounded border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded border px-2 py-1 text-xs font-bold ${severityClassName(issue.severity)}`}>{severityLabel(issue.severity)}</span>
        <span className="min-w-0 font-bold">{issue.targetLabel}</span>
        <span className="text-sm text-zinc-400">영향 {issue.impact}건</span>
      </div>
      <p className="mt-3 text-sm text-zinc-300">{issue.reason}</p>
      <Link href={issue.link.href} className="mt-4 inline-block text-sm font-semibold underline underline-offset-4 hover:text-brand-neon">{issue.link.label}에서 해결</Link>
    </article>)}
  </section>;
}
