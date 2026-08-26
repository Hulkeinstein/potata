import type {
  OperationCampaignFact,
  OperationIssue,
  OperationIssueFacts,
  OperationIssueKind,
  OperationIssueLink,
  OperationIssueSeverity,
  OperationProductFact,
  OperationVariantFact,
} from "@/types/operations-assistant";
import { prisma } from "@/lib/prisma";

const SEVERITY_RANK = { immediate: 0, warning: 1, info: 2 } as const satisfies Record<OperationIssueSeverity, number>;

function isNonNegativeInteger(value: number | null): value is number {
  return value !== null && Number.isSafeInteger(value) && value >= 0;
}

function hasConfirmedVariantState(variant: OperationVariantFact): variant is OperationVariantFact & { readonly stock: number; readonly isManuallySoldOut: boolean } {
  return isNonNegativeInteger(variant.stock) && variant.isManuallySoldOut !== null;
}

function productLink(productId: string): OperationIssueLink {
  return { destination: "product", href: `/admin/products/${productId}/edit`, label: "상품 관리" };
}

function createIssue(
  severity: OperationIssueSeverity,
  kind: OperationIssueKind,
  reason: string,
  impact: number,
  targetId: string,
  targetLabel: string,
  link: OperationIssueLink,
): OperationIssue {
  return { severity, kind, reason, impact, targetId, targetLabel, link };
}

function productIssues(product: OperationProductFact): readonly OperationIssue[] {
  if (product.isActive === false) {
    return [createIssue("info", "INACTIVE_PRODUCT", "판매 중지 상태입니다.", 1, product.id, product.name, productLink(product.id))];
  }
  if (product.isActive !== true) return [];

  const issues: OperationIssue[] = [];
  if (product.variants !== null) {
    if (product.variants.length === 0) {
      issues.push(createIssue("immediate", "ACTIVE_PRODUCT_NO_VARIANTS", "판매 중 상품에 옵션이 없습니다.", 1, product.id, product.name, productLink(product.id)));
    } else {
      const variants = product.variants.filter(hasConfirmedVariantState);
      if (variants.length === product.variants.length && variants.every((variant) => variant.stock === 0 || variant.isManuallySoldOut)) {
        issues.push(createIssue("immediate", "ACTIVE_PRODUCT_ALL_UNAVAILABLE", "판매 중 상품의 모든 옵션을 현재 구매할 수 없습니다.", 1, product.id, product.name, productLink(product.id)));
      }
      const manualSoldOutCount = variants.filter((variant) => variant.isManuallySoldOut && variant.stock > 0).length;
      if (manualSoldOutCount > 0) {
        issues.push(createIssue("warning", "MANUAL_SOLD_OUT_WITH_STOCK", "재고가 남은 옵션이 수동 품절 상태입니다.", manualSoldOutCount, product.id, product.name, { destination: "inventory", href: "/admin/inventory", label: "재고 운영" }));
      }
      const lowStockCount = variants.filter((variant) => !variant.isManuallySoldOut && variant.stock >= 1 && variant.stock <= 3).length;
      if (lowStockCount > 0) {
        issues.push(createIssue("warning", "LOW_STOCK_VARIANT", "옵션 재고가 1~3개입니다.", lowStockCount, product.id, product.name, { destination: "inventory", href: "/admin/inventory", label: "재고 운영" }));
      }
    }
  }
  if (product.imageUrl !== null && product.imageUrl.trim().length === 0) {
    issues.push(createIssue("warning", "MISSING_PRODUCT_IMAGE", "대표 이미지 URL이 비어 있습니다.", 1, product.id, product.name, productLink(product.id)));
  }
  return issues;
}

function campaignIssues(campaign: OperationCampaignFact): readonly OperationIssue[] {
  if (campaign.isActive !== true || !isNonNegativeInteger(campaign.grantCount) || campaign.grantCount !== 0) return [];
  return [createIssue("info", "ACTIVE_UNISSUED_CAMPAIGN", "활성 쿠폰 캠페인이 아직 발급되지 않았습니다.", 1, campaign.id, campaign.name, { destination: "benefits", href: "/admin/benefits", label: "쿠폰·포인트" })];
}

function compareIssues(left: OperationIssue, right: OperationIssue): number {
  const severityDifference = SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
  if (severityDifference !== 0) return severityDifference;
  const impactDifference = right.impact - left.impact;
  if (impactDifference !== 0) return impactDifference;
  if (left.kind < right.kind) return -1;
  if (left.kind > right.kind) return 1;
  if (left.targetId < right.targetId) return -1;
  if (left.targetId > right.targetId) return 1;
  return 0;
}

export function classifyOperationsIssues(facts: OperationIssueFacts): readonly OperationIssue[] {
  const productIssuesResult = facts.products.flatMap(productIssues);
  const questionIssues = facts.unansweredQuestions.flatMap((question) => (
    isNonNegativeInteger(question.count) && question.count > 0
      ? [createIssue("immediate", "UNANSWERED_QUESTIONS", "미답변 상품 문의가 있습니다.", question.count, question.productId, question.productName, { destination: "questions", href: "/admin/questions?status=unanswered", label: "Q&A 인박스" })]
      : []
  ));
  const campaignIssuesResult = facts.campaigns.flatMap(campaignIssues);
  return [...productIssuesResult, ...questionIssues, ...campaignIssuesResult].sort(compareIssues);
}

/**
 * Reads only the product, inventory, unanswered-question, and campaign facts
 * required for the safe-mode admin assistant. It deliberately returns the
 * public admin issue DTO rather than Prisma records.
 */
export async function listOperationsIssues(): Promise<readonly OperationIssue[]> {
  const [products, campaigns] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
        imageUrl: true,
        variants: { select: { id: true, stock: true, isManuallySoldOut: true } },
        _count: { select: { questions: { where: { answers: { none: {} } } } } },
      },
    }),
    prisma.couponCampaign.findMany({
      where: { active: true },
      select: { id: true, name: true, active: true, _count: { select: { grants: true } } },
    }),
  ]);

  return classifyOperationsIssues({
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      isActive: product.isActive,
      imageUrl: product.imageUrl,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        stock: variant.stock,
        isManuallySoldOut: variant.isManuallySoldOut,
      })),
    })),
    unansweredQuestions: products.flatMap((product) => product._count.questions > 0
      ? [{ productId: product.id, productName: product.name, count: product._count.questions }]
      : []),
    campaigns: campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      isActive: campaign.active,
      grantCount: campaign._count.grants,
    })),
  });
}
