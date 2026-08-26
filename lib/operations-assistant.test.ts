import { beforeEach, describe, expect, it, vi } from "vitest";

const { productFindManyMock, campaignFindManyMock } = vi.hoisted(() => ({
  productFindManyMock: vi.fn(),
  campaignFindManyMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { findMany: productFindManyMock },
    couponCampaign: { findMany: campaignFindManyMock },
  },
}));

import { classifyOperationsIssues, listOperationsIssues } from "@/lib/operations-assistant";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("operations assistant classifier", () => {
  it("classifies only confirmed operating issues in severity order", () => {
    // Given: products, variants, questions, and campaigns with confirmed operational states
    const input = {
      products: [
        { id: "sold-out", name: "Sold out", isActive: true, imageUrl: "https://example.com/sold-out.jpg", variants: [{ id: "sold-out-v", stock: 0, isManuallySoldOut: false }] },
        { id: "no-variants", name: "No variants", isActive: true, imageUrl: "https://example.com/no-variants.jpg", variants: [] },
        { id: "low-stock", name: "Low stock", isActive: true, imageUrl: "https://example.com/low-stock.jpg", variants: [{ id: "low-stock-v", stock: 3, isManuallySoldOut: false }] },
        { id: "manual", name: "Manual sold out", isActive: true, imageUrl: "https://example.com/manual.jpg", variants: [{ id: "manual-v", stock: 5, isManuallySoldOut: true }] },
        { id: "missing-image", name: "Missing image", isActive: true, imageUrl: "   ", variants: [{ id: "missing-image-v", stock: 5, isManuallySoldOut: false }] },
        { id: "inactive", name: "Inactive", isActive: false, imageUrl: "", variants: [{ id: "inactive-v", stock: 1, isManuallySoldOut: false }] },
      ],
      unansweredQuestions: [{ productId: "inactive", productName: "Inactive", count: 2 }],
      campaigns: [{ id: "campaign", name: "Welcome", isActive: true, grantCount: 0 }],
    };

    // When: the safe-mode classifier derives its read-only issue DTOs
    const issues = classifyOperationsIssues(input);

    // Then: it returns only confirmed issues with the allowed admin resolution links
    expect(issues.map((issue) => [issue.kind, issue.severity, issue.impact, issue.link.href])).toEqual([
      ["UNANSWERED_QUESTIONS", "immediate", 2, "/admin/questions?status=unanswered"],
      ["ACTIVE_PRODUCT_ALL_UNAVAILABLE", "immediate", 1, "/admin/products/manual/edit"],
      ["ACTIVE_PRODUCT_ALL_UNAVAILABLE", "immediate", 1, "/admin/products/sold-out/edit"],
      ["ACTIVE_PRODUCT_NO_VARIANTS", "immediate", 1, "/admin/products/no-variants/edit"],
      ["LOW_STOCK_VARIANT", "warning", 1, "/admin/inventory"],
      ["MANUAL_SOLD_OUT_WITH_STOCK", "warning", 1, "/admin/inventory"],
      ["MISSING_PRODUCT_IMAGE", "warning", 1, "/admin/products/missing-image/edit"],
      ["ACTIVE_UNISSUED_CAMPAIGN", "info", 1, "/admin/benefits"],
      ["INACTIVE_PRODUCT", "info", 1, "/admin/products/inactive/edit"],
    ]);
  });

  it("excludes uncertain or explicitly healthy states", () => {
    // Given: an external image URL, an inactive campaign, and no unanswered questions
    const input = {
      products: [{ id: "healthy", name: "Healthy", isActive: true, imageUrl: "https://cdn.example.com/image.jpg", variants: [{ id: "healthy-v", stock: 4, isManuallySoldOut: false }] }],
      unansweredQuestions: [],
      campaigns: [{ id: "inactive-campaign", name: "Inactive", isActive: false, grantCount: 0 }],
    };

    // When: the safe-mode classifier sees no confirmed issue
    const issues = classifyOperationsIssues(input);

    // Then: it does not invent an alert from an external URL or inactive state
    expect(issues).toEqual([]);
  });

  it("treats every manually sold-out variant as an unavailable product", () => {
    // Given: stock remains recorded, but every purchasable option is manually blocked
    const input = {
      products: [{
        id: "manual-only",
        name: "Manually blocked product",
        isActive: true,
        imageUrl: "https://example.com/manual-only.jpg",
        variants: [
          { id: "manual-only-s", stock: 3, isManuallySoldOut: true },
          { id: "manual-only-m", stock: 8, isManuallySoldOut: true },
        ],
      }],
      unansweredQuestions: [],
      campaigns: [],
    };

    // When: the safe-mode classifier checks actual customer availability
    const issues = classifyOperationsIssues(input);

    // Then: the purchase block is immediate, while the manual-stock warning remains actionable
    expect(issues.map((issue) => [issue.kind, issue.severity, issue.impact])).toEqual([
      ["ACTIVE_PRODUCT_ALL_UNAVAILABLE", "immediate", 1],
      ["MANUAL_SOLD_OUT_WITH_STOCK", "warning", 2],
    ]);
  });

  it("does not alert from incomplete facts and remains deterministic", () => {
    // Given: incomplete facts that cannot prove an operational state
    const input = {
      products: [{ id: "unknown", name: "Unknown", isActive: null, imageUrl: null, variants: null }],
      unansweredQuestions: [{ productId: "unknown", productName: "Unknown", count: null }],
      campaigns: [{ id: "unknown-campaign", name: "Unknown", isActive: null, grantCount: null }],
    };

    // When: the exact facts are classified twice
    const first = classifyOperationsIssues(input);
    const second = classifyOperationsIssues(input);

    // Then: uncertain input creates no false issue and the output is stable
    expect(first).toEqual([]);
    expect(second).toEqual(first);
  });

  it("loads only operational facts and derives sanitized issues from real aggregates", async () => {
    // Given: persisted product, variant, unanswered-question count, and campaign facts only
    productFindManyMock.mockResolvedValue([
      {
        id: "product-low",
        name: "Low stock jacket",
        isActive: true,
        imageUrl: "https://cdn.example.com/jacket.jpg",
        variants: [{ id: "variant-low", stock: 2, isManuallySoldOut: false }],
        _count: { questions: 3 },
      },
      {
        id: "product-inactive",
        name: "Paused coat",
        isActive: false,
        imageUrl: "",
        variants: [],
        _count: { questions: 0 },
      },
    ]);
    campaignFindManyMock.mockResolvedValue([
      { id: "campaign-1", name: "Welcome", active: true, _count: { grants: 0 } },
    ]);

    // When: the server-side loader reads the existing admin aggregates
    const issues = await listOperationsIssues();

    // Then: each issue stays in the Task 1 DTO boundary with an existing admin link
    expect(issues.map((issue) => [issue.kind, issue.severity, issue.impact, issue.link.href])).toEqual([
      ["UNANSWERED_QUESTIONS", "immediate", 3, "/admin/questions?status=unanswered"],
      ["LOW_STOCK_VARIANT", "warning", 1, "/admin/inventory"],
      ["ACTIVE_UNISSUED_CAMPAIGN", "info", 1, "/admin/benefits"],
      ["INACTIVE_PRODUCT", "info", 1, "/admin/products/product-inactive/edit"],
    ]);
    expect(JSON.stringify(issues)).not.toContain("email");
    expect(productFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        id: true,
        name: true,
        isActive: true,
        imageUrl: true,
        variants: { select: { id: true, stock: true, isManuallySoldOut: true } },
        _count: { select: { questions: { where: { answers: { none: {} } } } } },
      }),
    }));
    expect(campaignFindManyMock).toHaveBeenCalledWith({
      where: { active: true },
      select: { id: true, name: true, active: true, _count: { select: { grants: true } } },
    });
  });

  it("returns no issue for an empty operational dataset", async () => {
    // Given: no matching database records
    productFindManyMock.mockResolvedValue([]);
    campaignFindManyMock.mockResolvedValue([]);

    // When: the read-only loader runs
    const issues = await listOperationsIssues();

    // Then: it does not manufacture an alert
    expect(issues).toEqual([]);
  });
});
