import Link from "next/link";
import { getAdminDashboardSummary } from "@/lib/admin-dashboard";

const FUTURE_ANALYTICS = ["총매출 · 순매출 · 수금액", "판매량 · 누적 판매량 · 평균 주문 금액", "상품·브랜드·카테고리 판매 순위", "환불·할인·쿠폰 사용 · 재구매 · 전환 퍼널"] as const;

export default async function AdminHomePage() {
  const summary = await getAdminDashboardSummary();
  const live = [
    { label: "전체 상품", value: summary.totalProducts }, { label: "판매 중", value: summary.activeProducts }, { label: "판매 중지", value: summary.inactiveProducts }, { label: "판매 가능한 상품", value: summary.productsWithAvailableVariant },
    { label: "전체 품절 상품", value: summary.soldOutProducts }, { label: "저재고 옵션", value: summary.lowStockVariants }, { label: "재고 0 옵션", value: summary.zeroStockVariants }, { label: "수동 품절 옵션", value: summary.manuallySoldOutVariants },
    { label: "활성 쿠폰 캠페인", value: summary.activeCouponCampaigns }, { label: "미답변 Q&A", value: summary.unansweredQuestions, href: "/admin/questions?status=unanswered" },
  ] as const;
  return <main className="min-h-screen bg-black px-4 py-10 text-white"><div className="mx-auto max-w-6xl space-y-8"><header><h1 className="text-3xl font-black">운영 홈</h1><p className="mt-2 text-sm text-zinc-400">실제 운영 데이터만 표시합니다. 매출·순위 데이터는 결제 확정 이후 연결합니다.</p></header><section><h2 className="mb-3 text-lg font-bold">현재 운영 현황</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{live.map((item) => {
    const metric = <><p className="text-xs text-zinc-400">{item.label}</p><p className="mt-2 text-2xl font-black">{item.value}</p></>;
    return "href" in item
      ? <Link key={item.label} href={item.href} className="rounded border border-zinc-800 bg-zinc-950 p-4 hover:border-brand-neon focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-neon">{metric}</Link>
      : <article key={item.label} className="rounded border border-zinc-800 bg-zinc-950 p-4">{metric}</article>;
  })}</div></section><section className="grid gap-3 md:grid-cols-3"><Link href="/admin/products" className="rounded border border-zinc-800 bg-zinc-950 p-5 hover:border-brand-neon"><h2 className="font-bold">상품 관리</h2><p className="mt-1 text-sm text-zinc-400">상품 등록·수정·판매 상태</p></Link><Link href="/admin/inventory" className="rounded border border-zinc-800 bg-zinc-950 p-5 hover:border-brand-neon"><h2 className="font-bold">재고 운영</h2><p className="mt-1 text-sm text-zinc-400">옵션별 재고 조정과 이력</p></Link><Link href="/admin/benefits" className="rounded border border-zinc-800 bg-zinc-950 p-5 hover:border-brand-neon"><h2 className="font-bold">쿠폰·포인트</h2><p className="mt-1 text-sm text-zinc-400">Pilot 캠페인과 지급 관리</p></Link></section><section><h2 className="mb-3 text-lg font-bold">분석 데이터 연결 대기</h2><div className="grid gap-3 md:grid-cols-2">{FUTURE_ANALYTICS.map((label) => <article key={label} className="rounded border border-dashed border-zinc-700 p-4"><h3 className="font-medium">{label}</h3><p className="mt-1 text-sm text-zinc-400">결제 확정·환불·원가·웹 분석 데이터 연결 후 표시</p></article>)}</div></section></div></main>;
}
