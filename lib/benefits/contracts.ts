export type BenefitScope = "ALL_PRODUCTS" | "BRANDS";

export type CampaignInput = {
  readonly name: string;
  readonly ratePercent: number;
  readonly minOrderAed: number;
  readonly maxDiscountAed: number;
  readonly scope: BenefitScope;
  readonly brands: readonly string[];
  readonly reason: string;
  readonly expiresAt?: string | null;
};

export type PointPolicyInput = {
  readonly rateBasisPoints: number;
  readonly perOrderCap: number;
  readonly scope: BenefitScope;
  readonly brands: readonly string[];
  readonly activationEvent: string;
  readonly reason: string;
  readonly effectiveFrom?: string | null;
  readonly effectiveUntil?: string | null;
};

export type ManualPointInput = {
  readonly email: string;
  readonly amount: number;
  readonly reason: string;
  readonly idempotencyKey: string;
};

type ParseResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

const nonBlank = (value: string): boolean => value.trim().length > 0 && value.trim().length <= 200;

function validScope(scope: BenefitScope, brands: readonly string[], knownBrands: readonly string[]): boolean {
  const unique = new Set(brands.map((brand) => brand.trim()).filter(Boolean));
  if (scope === "ALL_PRODUCTS") return unique.size === 0;
  return unique.size > 0 && unique.size === brands.length && [...unique].every((brand) => knownBrands.includes(brand));
}

export function parseCampaignInput(value: CampaignInput, knownBrands: readonly string[]): ParseResult<CampaignInput> {
  if (!nonBlank(value.name) || !nonBlank(value.reason)) return { ok: false, error: "이름과 사유가 필요합니다." };
  if (!Number.isInteger(value.ratePercent) || value.ratePercent < 1 || value.ratePercent > 100) return { ok: false, error: "할인율은 1~100 정수여야 합니다." };
  if (!Number.isInteger(value.minOrderAed) || value.minOrderAed <= 0) return { ok: false, error: "최소 주문 AED는 양의 정수여야 합니다." };
  if (!Number.isInteger(value.maxDiscountAed) || value.maxDiscountAed <= 0) return { ok: false, error: "최대 할인 AED는 양의 정수여야 합니다." };
  if (!validScope(value.scope, value.brands, knownBrands)) return { ok: false, error: "브랜드 범위가 유효하지 않습니다." };
  if (value.expiresAt && Number.isNaN(Date.parse(value.expiresAt))) return { ok: false, error: "만료 시간이 유효하지 않습니다." };
  return { ok: true, value: { ...value, name: value.name.trim(), reason: value.reason.trim(), brands: value.brands.map((brand) => brand.trim()) } };
}

export function parsePointPolicyInput(value: PointPolicyInput, knownBrands: readonly string[]): ParseResult<PointPolicyInput> {
  if (!nonBlank(value.reason) || value.activationEvent !== "PURCHASE_CONFIRMED") return { ok: false, error: "정책 사유와 구매확정 이벤트가 필요합니다." };
  if (!Number.isInteger(value.rateBasisPoints) || value.rateBasisPoints < 1 || value.rateBasisPoints > 10_000) return { ok: false, error: "적립률이 유효하지 않습니다." };
  if (!Number.isInteger(value.perOrderCap) || value.perOrderCap <= 0) return { ok: false, error: "주문별 상한이 유효하지 않습니다." };
  if (!validScope(value.scope, value.brands, knownBrands)) return { ok: false, error: "브랜드 범위가 유효하지 않습니다." };
  if (value.effectiveFrom && Number.isNaN(Date.parse(value.effectiveFrom))) return { ok: false, error: "정책 시작 시간이 유효하지 않습니다." };
  if (value.effectiveUntil && Number.isNaN(Date.parse(value.effectiveUntil))) return { ok: false, error: "정책 종료 시간이 유효하지 않습니다." };
  if (value.effectiveFrom && value.effectiveUntil && Date.parse(value.effectiveUntil) <= Date.parse(value.effectiveFrom)) return { ok: false, error: "정책 종료는 시작 이후여야 합니다." };
  return { ok: true, value: { ...value, reason: value.reason.trim(), brands: value.brands.map((brand) => brand.trim()) } };
}

export function parseManualPointInput(value: ManualPointInput): ParseResult<ManualPointInput> {
  const email = value.email.trim().toLowerCase();
  if (!email.includes("@") || !nonBlank(value.reason) || !nonBlank(value.idempotencyKey)) return { ok: false, error: "이메일, 사유, 멱등 키가 필요합니다." };
  if (!Number.isInteger(value.amount) || value.amount <= 0) return { ok: false, error: "포인트는 양의 정수여야 합니다." };
  return { ok: true, value: { ...value, email, reason: value.reason.trim(), idempotencyKey: value.idempotencyKey.trim() } };
}
