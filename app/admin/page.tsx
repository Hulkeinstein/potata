// 관리자 화면은 항상 현재 DB 상태를 보여야 한다 — 정적 생성되면 수치가 빌드 시점에 굳어 재배포 전까지 갱신되지 않는다.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { getAdminDashboardSummary } from "@/lib/admin-dashboard";
import { listOperationsIssues } from "@/lib/operations-assistant";
import { OperationsIssueList } from "@/components/admin/OperationsIssueList";

const FUTURE_ANALYTICS = [
  "총매출 · 순매출 · 수금액",
  "판매량 · 누적 판매량 · 평균 주문 금액",
  "상품·브랜드·카테고리 판매 순위",
  "환불·할인·쿠폰 사용 · 재구매 · 전환 퍼널",
] as const;

const SHORTCUTS = [
  { href: "/admin/inventory?filter=low-stock", label: "저재고 보충", detail: "재고 1~3개 옵션 확인" },
  { href: "/admin/inventory?filter=sold-out", label: "자동 품절 보기", detail: "수동 품절을 제외한 재고 0 옵션" },
  { href: "/admin/inventory?filter=manual-sold-out", label: "수동 품절 확인", detail: "직접 품절 처리한 옵션" },
  { href: "/admin/questions?status=unanswered", label: "미답변 문의", detail: "아직 답변하지 않은 상품 문의" },
] as const;

export default async function AdminHomePage() {
  const [summary, operationsIssues] = await Promise.all([
    getAdminDashboardSummary(),
    listOperationsIssues(),
  ]);
  const live = [
    { label: "전체 상품", value: summary.totalProducts, href: "/admin/products" },
    { label: "판매 중", value: summary.activeProducts },
    { label: "판매 중지", value: summary.inactiveProducts },
    { label: "판매 가능한 상품", value: summary.productsWithAvailableVariant },
    { label: "전체 품절 상품", value: summary.soldOutProducts },
    { label: "저재고 옵션", value: summary.lowStockVariants },
    { label: "재고 0 옵션", value: summary.zeroStockVariants },
    { label: "수동 품절 옵션", value: summary.manuallySoldOutVariants, href: "/admin/inventory?filter=manual-sold-out" },
    { label: "활성 쿠폰 캠페인", value: summary.activeCouponCampaigns },
    { label: "미답변 Q&A", value: summary.unansweredQuestions, href: "/admin/questions?status=unanswered" },
  ] as const;

  return (
    <main className="bg-black px-4 py-8 text-white lg:px-8 lg:py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div><p className="mb-2 text-xs font-semibold tracking-widest text-zinc-500">OPERATIONS / OVERVIEW</p><h1 className="text-3xl font-black tracking-tight">운영 홈</h1><p className="mt-2 text-sm text-zinc-400">확인이 필요한 일부터 처리하세요. 실제 운영 데이터만 표시합니다.</p></div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/products" className="rounded border border-zinc-700 px-4 py-2.5 text-sm font-bold hover:border-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-neon">상품 관리</Link>
            <Link href="/admin/products/new" className="rounded bg-brand-neon px-4 py-2.5 text-sm font-bold text-black hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-neon">+ 상품 등록</Link>
          </div>
        </header>

        <section aria-labelledby="operations-assistant-heading" className="rounded border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 pb-4">
            <div>
              <h2 id="operations-assistant-heading" className="text-xl font-bold">처리할 일</h2>
              <p className="mt-1 text-sm text-zinc-400">운영 어시스턴트 · 확인할 운영 이슈 {operationsIssues.length}개</p>
            </div>
            <Link href="/admin/operations" className="rounded px-1 py-2 text-sm font-medium text-brand-neon underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-neon">
              전체 이슈 보기
            </Link>
          </div>
          <OperationsIssueList issues={operationsIssues.slice(0, 5)} />
          <p className="mt-4 text-xs leading-5 text-zinc-500">기존 우선순위 순으로 최대 5개를 보여줍니다. 이슈 수와 영향 건수, 재고 옵션 수는 서로 다른 단위입니다.</p>
        </section>

        <section aria-labelledby="admin-shortcuts-heading">
          <h2 id="admin-shortcuts-heading" className="mb-3 text-lg font-bold">바로 처리</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{SHORTCUTS.map((item) => <Link key={item.href} href={item.href} className="rounded border border-zinc-800 bg-zinc-950 p-4 hover:border-zinc-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-neon"><h3 className="font-semibold">{item.label} ↗</h3><p className="mt-1 text-xs leading-5 text-zinc-400">{item.detail}</p></Link>)}</div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">현재 운영 현황</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {live.map((item) => {
              const metric = <><p className="text-xs text-zinc-400">{item.label}</p><p className="mt-2 text-2xl font-black">{item.value}</p></>;
              return "href" in item
                ? <Link key={item.label} href={item.href} className="rounded border border-zinc-800 bg-zinc-950 p-4 hover:border-brand-neon focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-neon">{metric}</Link>
                : <article key={item.label} className="rounded border border-zinc-800 bg-zinc-950 p-4">{metric}</article>;
            })}
          </div>
          <p className="mt-3 text-xs leading-5 text-zinc-500">재고 0 옵션에는 수동 품절도 포함됩니다. 자동 품절 보기와 수치 범위가 다릅니다.</p>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <Link href="/admin/products" className="rounded border border-zinc-800 bg-zinc-950 p-5 hover:border-brand-neon"><h2 className="font-bold">상품 관리</h2><p className="mt-1 text-sm text-zinc-400">상품 등록·수정·판매 상태</p></Link>
          <Link href="/admin/inventory" className="rounded border border-zinc-800 bg-zinc-950 p-5 hover:border-brand-neon"><h2 className="font-bold">재고 운영</h2><p className="mt-1 text-sm text-zinc-400">옵션별 재고 조정과 이력</p></Link>
          <Link href="/admin/benefits" className="rounded border border-zinc-800 bg-zinc-950 p-5 hover:border-brand-neon"><h2 className="font-bold">쿠폰·포인트</h2><p className="mt-1 text-sm text-zinc-400">Pilot 캠페인과 지급 관리</p></Link>
        </section>

        <section className="rounded border border-dashed border-zinc-800 p-4 text-sm">
          <h2 className="font-semibold text-zinc-300">판매 분석 연결 대기</h2>
          <p className="mt-1 leading-6 text-zinc-500">{FUTURE_ANALYTICS.join(" / ")}</p>
          <p className="mt-1 text-xs text-zinc-500">결제 확정·환불·원가·웹 분석 데이터 연결 후 표시합니다. 현재 수치로 추정하지 않습니다.</p>
        </section>
      </div>
    </main>
  );
}
