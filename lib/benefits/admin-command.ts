import type { CampaignInput, ManualPointInput, PointPolicyInput } from "./contracts";

type WriteAuth = { readonly idempotencyKey: string; readonly reauthPassword?: string; readonly reauthProof?: string };
type AdminCommand =
  | ({ readonly action: "CREATE_CAMPAIGN"; readonly input: CampaignInput } & WriteAuth)
  | ({ readonly action: "UPDATE_CAMPAIGN"; readonly campaignId: string; readonly input: CampaignInput } & WriteAuth)
  | ({ readonly action: "DEACTIVATE_CAMPAIGN"; readonly campaignId: string; readonly reason: string } & WriteAuth)
  | { readonly action: "PREVIEW"; readonly campaignId: string; readonly audience: "INDIVIDUAL" | "ALL_VERIFIED_USERS"; readonly email?: string }
  | ({ readonly action: "ISSUE"; readonly campaignId: string; readonly audience: "INDIVIDUAL" | "ALL_VERIFIED_USERS"; readonly email?: string; readonly confirmedCount: number; readonly confirmedToken: string; readonly reason: string } & WriteAuth)
  | ({ readonly action: "REVOKE_COUPON"; readonly grantId: string; readonly reason: string } & WriteAuth)
  | ({ readonly action: "CREATE_POINT_POLICY"; readonly input: PointPolicyInput } & WriteAuth)
  | ({ readonly action: "GRANT_POINTS"; readonly input: ManualPointInput } & WriteAuth)
  | ({ readonly action: "REVERSE_POINTS"; readonly sourceKey: string; readonly reason: string } & WriteAuth);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): string | null => typeof value === "string" ? value : null;
const integer = (value: unknown): number | null => typeof value === "number" && Number.isInteger(value) ? value : null;
const strings = (value: unknown): readonly string[] | null => Array.isArray(value) && value.every((item) => typeof item === "string") ? value : null;
const scope = (value: unknown): "ALL_PRODUCTS" | "BRANDS" | null => value === "ALL_PRODUCTS" || value === "BRANDS" ? value : null;
const audience = (value: unknown): "INDIVIDUAL" | "ALL_VERIFIED_USERS" | null => value === "INDIVIDUAL" || value === "ALL_VERIFIED_USERS" ? value : null;

function writeAuth(value: Record<string, unknown>): WriteAuth | null {
  const idempotencyKey = text(value.idempotencyKey); const reauthPassword = text(value.reauthPassword); const reauthProof = text(value.reauthProof);
  if (!idempotencyKey || (!reauthPassword && !reauthProof)) return null;
  return { idempotencyKey, ...(reauthPassword ? { reauthPassword } : {}), ...(reauthProof ? { reauthProof } : {}) };
}

function campaign(value: Record<string, unknown>): CampaignInput | null {
  const name = text(value.name); const ratePercent = integer(value.ratePercent); const minOrderAed = integer(value.minOrderAed); const maxDiscountAed = integer(value.maxDiscountAed);
  const parsedScope = scope(value.scope); const brands = strings(value.brands); const reason = text(value.reason);
  if (name === null || ratePercent === null || minOrderAed === null || maxDiscountAed === null || !parsedScope || !brands || reason === null) return null;
  const expiresAt = value.expiresAt === null || value.expiresAt === undefined ? null : text(value.expiresAt);
  return expiresAt === null && value.expiresAt !== null && value.expiresAt !== undefined ? null : { name, ratePercent, minOrderAed, maxDiscountAed, scope: parsedScope, brands, reason, expiresAt };
}

function pointPolicy(value: Record<string, unknown>): PointPolicyInput | null {
  const rateBasisPoints = integer(value.rateBasisPoints); const perOrderCap = integer(value.perOrderCap); const parsedScope = scope(value.scope);
  const brands = strings(value.brands); const activationEvent = text(value.activationEvent); const reason = text(value.reason);
  if (rateBasisPoints === null || perOrderCap === null || !parsedScope || !brands || activationEvent === null || reason === null) return null;
  const effectiveFrom = value.effectiveFrom === null || value.effectiveFrom === undefined ? null : text(value.effectiveFrom);
  const effectiveUntil = value.effectiveUntil === null || value.effectiveUntil === undefined ? null : text(value.effectiveUntil);
  return { rateBasisPoints, perOrderCap, scope: parsedScope, brands, activationEvent, reason, effectiveFrom, effectiveUntil };
}

export function parseAdminCommand(value: unknown): AdminCommand | null {
  if (!isRecord(value)) return null;
  const action = text(value.action);
  if (action === "PREVIEW") { const campaignId = text(value.campaignId); const parsedAudience = audience(value.audience); const email = text(value.email) ?? undefined; return campaignId && parsedAudience ? { action, campaignId, audience: parsedAudience, email } : null; }
  const auth = writeAuth(value); if (!auth) return null;
  if (action === "CREATE_CAMPAIGN") { const input = campaign(value); return input ? { action, input, ...auth } : null; }
  if (action === "UPDATE_CAMPAIGN") { const input = campaign(value); const campaignId = text(value.campaignId); return input && campaignId ? { action, campaignId, input, ...auth } : null; }
  if (action === "DEACTIVATE_CAMPAIGN") { const campaignId = text(value.campaignId); const reason = text(value.reason); return campaignId && reason ? { action, campaignId, reason, ...auth } : null; }
  if (action === "CREATE_POINT_POLICY") { const input = pointPolicy(value); return input ? { action, input, ...auth } : null; }
  if (action === "ISSUE") {
    const campaignId = text(value.campaignId); const parsedAudience = audience(value.audience); const confirmedCount = integer(value.confirmedCount); const confirmedToken = text(value.confirmedToken); const reason = text(value.reason); const email = text(value.email) ?? undefined;
    return campaignId && parsedAudience && confirmedCount !== null && confirmedToken && reason ? { action, campaignId, audience: parsedAudience, confirmedCount, confirmedToken, reason, email, ...auth } : null;
  }
  if (action === "REVOKE_COUPON") { const grantId = text(value.grantId); const reason = text(value.reason); return grantId && reason ? { action, grantId, reason, ...auth } : null; }
  if (action === "GRANT_POINTS") { const email = text(value.email); const amount = integer(value.amount); const reason = text(value.reason); return email && amount !== null && reason ? { action, input: { email, amount, reason, idempotencyKey: auth.idempotencyKey }, ...auth } : null; }
  if (action === "REVERSE_POINTS") { const sourceKey = text(value.sourceKey); const reason = text(value.reason); return sourceKey && reason ? { action, sourceKey, reason, ...auth } : null; }
  return null;
}
