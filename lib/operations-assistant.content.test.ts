import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { classifyOperationsIssues } from "./operations-assistant";

const product = { id: "p1", name: "상품", isActive: true, imageUrl: "", variants: [{ id: "v1", stock: 5, isManuallySoldOut: false }] };
describe("operations content completeness", () => {
  it("emits one description issue per active product and reuses the single image issue", () => {
    // Given: both locale fields are empty even though a legacy description exists.
    const facts = { products: [{ ...product, descriptionKo: " \n", descriptionEn: null, description: "Legacy" }], unansweredQuestions: [], campaigns: [] };
    // When:
    const issues = classifyOperationsIssues(facts);
    // Then:
    expect(issues.map(({ kind, severity, impact }) => ({ kind, severity, impact }))).toEqual([
      { kind: "MISSING_PRODUCT_DESCRIPTION", severity: "warning", impact: 1 },
      { kind: "MISSING_PRODUCT_IMAGE", severity: "warning", impact: 1 },
    ]);
    expect(issues[0]?.reason).toContain("한국어");
    expect(issues[0]?.reason).toContain("영어");
  });
  it("does not warn inactive products or unqueried description and image facts", () => {
    const facts = { products: [{ ...product, isActive: false, descriptionKo: null, descriptionEn: null }, { ...product, id: "unknown", imageUrl: null }], unansweredQuestions: [], campaigns: [] };
    expect(classifyOperationsIssues(facts).map(({ kind }) => kind)).toEqual(["INACTIVE_PRODUCT"]);
  });
  it("names only the missing locale without mistaking customer fallback for completion", () => {
    const facts = { products: [{ ...product, imageUrl: "/image.png", descriptionKo: "한글", descriptionEn: " " }], unansweredQuestions: [], campaigns: [] };
    const issues = classifyOperationsIssues(facts);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.reason).toContain("영어");
    expect(issues[0]?.reason).not.toContain("한국어");
  });
});
