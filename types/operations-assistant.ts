export const OPERATION_ISSUE_SEVERITIES = ["immediate", "warning", "info"] as const;

export type OperationIssueSeverity = (typeof OPERATION_ISSUE_SEVERITIES)[number];

export const OPERATION_ISSUE_KINDS = [
  "ACTIVE_PRODUCT_ALL_UNAVAILABLE",
  "ACTIVE_PRODUCT_NO_VARIANTS",
  "UNANSWERED_QUESTIONS",
  "LOW_STOCK_VARIANT",
  "MANUAL_SOLD_OUT_WITH_STOCK",
  "MISSING_PRODUCT_IMAGE",
  "INACTIVE_PRODUCT",
  "ACTIVE_UNISSUED_CAMPAIGN",
] as const;

export type OperationIssueKind = (typeof OPERATION_ISSUE_KINDS)[number];

export type OperationIssueLink =
  | { readonly destination: "product"; readonly href: `/admin/products/${string}/edit`; readonly label: "상품 관리" }
  | { readonly destination: "inventory"; readonly href: "/admin/inventory"; readonly label: "재고 운영" }
  | { readonly destination: "questions"; readonly href: "/admin/questions?status=unanswered"; readonly label: "Q&A 인박스" }
  | { readonly destination: "benefits"; readonly href: "/admin/benefits"; readonly label: "쿠폰·포인트" };

export type OperationIssue = {
  readonly severity: OperationIssueSeverity;
  readonly kind: OperationIssueKind;
  readonly reason: string;
  readonly impact: number;
  readonly targetId: string;
  readonly targetLabel: string;
  readonly link: OperationIssueLink;
};

export type OperationVariantFact = {
  readonly id: string;
  readonly stock: number | null;
  readonly isManuallySoldOut: boolean | null;
};

export type OperationProductFact = {
  readonly id: string;
  readonly name: string;
  readonly isActive: boolean | null;
  readonly imageUrl: string | null;
  readonly variants: readonly OperationVariantFact[] | null;
};

export type OperationUnansweredQuestionFact = {
  readonly productId: string;
  readonly productName: string;
  readonly count: number | null;
};

export type OperationCampaignFact = {
  readonly id: string;
  readonly name: string;
  readonly isActive: boolean | null;
  readonly grantCount: number | null;
};

export type OperationIssueFacts = {
  readonly products: readonly OperationProductFact[];
  readonly unansweredQuestions: readonly OperationUnansweredQuestionFact[];
  readonly campaigns: readonly OperationCampaignFact[];
};
