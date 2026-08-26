import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { dashboardSummaryMock, operationsIssuesMock } = vi.hoisted(() => ({
  dashboardSummaryMock: vi.fn(),
  operationsIssuesMock: vi.fn(),
}));

vi.mock("@/lib/admin-dashboard", () => ({ getAdminDashboardSummary: dashboardSummaryMock }));
vi.mock("@/lib/operations-assistant", () => ({ listOperationsIssues: operationsIssuesMock }));

import AdminHomePage from "./page";

beforeEach(() => {
  dashboardSummaryMock.mockResolvedValue({
    totalProducts: 9, activeProducts: 9, inactiveProducts: 0, productsWithAvailableVariant: 9,
    soldOutProducts: 0, manuallySoldOutVariants: 0, zeroStockVariants: 0, lowStockVariants: 0,
    activeCouponCampaigns: 0, unansweredQuestions: 0,
  });
  operationsIssuesMock.mockReset();
});

describe("admin home Q&A metric", () => {
  it("links unanswered questions to the accessible inbox filter", async () => {
    // Given: the server-rendered admin home source
    const source = await readFile("app/admin/page.tsx", "utf8");

    // When: an operator selects the unanswered Q&A metric

    // Then: it uses a keyboard-accessible navigation link to the unanswered inbox
    expect(source).toContain('href: "/admin/questions?status=unanswered"');
    expect(source).toContain('? <Link');
    expect(source).toContain('"미답변 Q&A"');
  });
});

describe("admin home operations assistant", () => {
  it("shows the exact total and only the five highest-priority issues", async () => {
    // Given: six pre-sorted read-only operational issues from the existing loader
    operationsIssuesMock.mockResolvedValue([
      { severity: "immediate", kind: "UNANSWERED_QUESTIONS", reason: "미답변 상품 문의가 있습니다.", impact: 3, targetId: "q", targetLabel: "문의 상품", link: { destination: "questions", href: "/admin/questions?status=unanswered", label: "Q&A 인박스" } },
      { severity: "immediate", kind: "ACTIVE_PRODUCT_NO_VARIANTS", reason: "판매 중 상품에 옵션이 없습니다.", impact: 1, targetId: "p1", targetLabel: "옵션 없는 상품", link: { destination: "product", href: "/admin/products/p1/edit", label: "상품 관리" } },
      { severity: "warning", kind: "LOW_STOCK_VARIANT", reason: "옵션 재고가 1~3개입니다.", impact: 2, targetId: "p2", targetLabel: "저재고 상품", link: { destination: "inventory", href: "/admin/inventory", label: "재고 운영" } },
      { severity: "warning", kind: "MISSING_PRODUCT_IMAGE", reason: "대표 이미지 URL이 비어 있습니다.", impact: 1, targetId: "p3", targetLabel: "이미지 없는 상품", link: { destination: "product", href: "/admin/products/p3/edit", label: "상품 관리" } },
      { severity: "info", kind: "INACTIVE_PRODUCT", reason: "판매 중지 상태입니다.", impact: 1, targetId: "p4", targetLabel: "중지 상품", link: { destination: "product", href: "/admin/products/p4/edit", label: "상품 관리" } },
      { severity: "info", kind: "ACTIVE_UNISSUED_CAMPAIGN", reason: "활성 쿠폰 캠페인이 아직 발급되지 않았습니다.", impact: 1, targetId: "c1", targetLabel: "웰컴 쿠폰", link: { destination: "benefits", href: "/admin/benefits", label: "쿠폰·포인트" } },
    ]);

    // When: the dashboard is rendered
    const html = renderToStaticMarkup(await AdminHomePage());

    // Then: it preserves the full count but limits the visible cards to the first five
    expect(html).toContain("운영 어시스턴트");
    expect(html).toContain("확인할 운영 이슈 6개");
    expect(html).toContain("즉시 확인");
    expect(html).toContain("주의");
    expect(html).toContain("정보");
    expect(html).toContain("미답변 상품 문의가 있습니다.");
    expect(html).toContain("영향 3건");
    expect(html).toContain('href="/admin/operations"');
    expect(html).toContain('href="/admin/questions?status=unanswered"');
    expect(html).not.toContain("웰컴 쿠폰");
  });

  it("shows a calm healthy state when the loader finds no issue", async () => {
    // Given: a healthy operational dataset
    operationsIssuesMock.mockResolvedValue([]);

    // When: the dashboard is rendered
    const html = renderToStaticMarkup(await AdminHomePage());

    // Then: it shows no fabricated alarm and keeps the full-view link available
    expect(html).toContain("현재 확인이 필요한 운영 이슈가 없습니다.");
    expect(html).toContain('href="/admin/operations"');
    expect(html).not.toContain("즉시 확인");
  });
});
