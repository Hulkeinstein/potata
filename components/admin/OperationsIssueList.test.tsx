import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OperationsIssueList } from "@/components/admin/OperationsIssueList";
import type { OperationIssue } from "@/types/operations-assistant";

const issues: readonly OperationIssue[] = [
  {
    severity: "immediate",
    kind: "UNANSWERED_QUESTIONS",
    reason: "미답변 상품 문의가 있습니다.",
    impact: 3,
    targetId: "question-product",
    targetLabel: "서울 재킷",
    link: { destination: "questions", href: "/admin/questions?status=unanswered", label: "Q&A 인박스" },
  },
  {
    severity: "warning",
    kind: "LOW_STOCK_VARIANT",
    reason: "옵션 재고가 1~3개입니다.",
    impact: 2,
    targetId: "low-stock-product",
    targetLabel: "두바이 셔츠",
    link: { destination: "inventory", href: "/admin/inventory", label: "재고 운영" },
  },
  {
    severity: "info",
    kind: "INACTIVE_PRODUCT",
    reason: "판매 중지 상태입니다.",
    impact: 1,
    targetId: "inactive-product",
    targetLabel: "잠시 중지한 코트",
    link: { destination: "product", href: "/admin/products/inactive-product/edit", label: "상품 관리" },
  },
];

describe("OperationsIssueList", () => {
  it("renders every read-only issue exactly once with Korean severity, impact, and resolution link", () => {
    // Given: complete, pre-sorted safe-mode operational issues

    // When: the operations list renders the complete view
    const html = renderToStaticMarkup(<OperationsIssueList issues={issues} />);

    // Then: each issue remains readable and points only to its existing resolution route
    expect(html.match(/서울 재킷/g)).toHaveLength(1);
    expect(html.match(/두바이 셔츠/g)).toHaveLength(1);
    expect(html.match(/잠시 중지한 코트/g)).toHaveLength(1);
    expect(html).toContain("즉시 확인");
    expect(html).toContain("주의");
    expect(html).toContain("정보");
    expect(html).toContain("영향 3건");
    expect(html).toContain('href="/admin/questions?status=unanswered"');
    expect(html).toContain('href="/admin/inventory"');
    expect(html).toContain('href="/admin/products/inactive-product/edit"');
    expect(html).not.toContain("button");
  });

  it("shows a calm healthy state when the loader returns no issue", () => {
    // Given: a healthy operational dataset

    // When: the complete operations view renders
    const html = renderToStaticMarkup(<OperationsIssueList issues={[]} />);

    // Then: it does not fabricate an operational alert
    expect(html).toContain("현재 확인이 필요한 운영 이슈가 없습니다.");
    expect(html).not.toContain("즉시 확인");
  });
});
