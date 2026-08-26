import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listOperationsIssuesMock } = vi.hoisted(() => ({ listOperationsIssuesMock: vi.fn() }));

vi.mock("@/lib/operations-assistant", () => ({ listOperationsIssues: listOperationsIssuesMock }));

import AdminOperationsPage from "./page";

describe("AdminOperationsPage", () => {
  beforeEach(() => {
    listOperationsIssuesMock.mockReset();
  });

  it("renders every loader issue once without an admin navigation duplicate", async () => {
    // Given: the protected admin layout and two safe-mode issues from the existing loader
    listOperationsIssuesMock.mockResolvedValue([
      { severity: "immediate", kind: "UNANSWERED_QUESTIONS", reason: "미답변 상품 문의가 있습니다.", impact: 2, targetId: "question-product", targetLabel: "서울 재킷", link: { destination: "questions", href: "/admin/questions?status=unanswered", label: "Q&A 인박스" } },
      { severity: "info", kind: "INACTIVE_PRODUCT", reason: "판매 중지 상태입니다.", impact: 1, targetId: "inactive-product", targetLabel: "중지 코트", link: { destination: "product", href: "/admin/products/inactive-product/edit", label: "상품 관리" } },
    ]);

    // When: the complete read-only operations page renders
    const html = renderToStaticMarkup(await AdminOperationsPage());

    // Then: it retains every issue and uses only existing resolution links
    expect(html.match(/서울 재킷/g)).toHaveLength(1);
    expect(html.match(/중지 코트/g)).toHaveLength(1);
    expect(html).toContain("확인할 운영 이슈 2개");
    expect(html).toContain('href="/admin/questions?status=unanswered"');
    expect(html).toContain('href="/admin/products/inactive-product/edit"');
    expect(html).toContain('href="/admin"');
  });

  it("shows a safe retry state when the read-only loader fails", async () => {
    // Given: an unexpected loader failure
    listOperationsIssuesMock.mockRejectedValue(new Error("database details must stay private"));

    // When: the protected operations page renders
    const html = renderToStaticMarkup(await AdminOperationsPage());

    // Then: no internal error detail is exposed and a retry link remains available
    expect(html).toContain("운영 이슈를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    expect(html).toContain('href="/admin/operations"');
    expect(html).not.toContain("database details must stay private");
  });
});
