import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/normalize";
import { parseCampaignInput, parseManualPointInput, parsePointPolicyInput, type CampaignInput, type ManualPointInput, type PointPolicyInput } from "./contracts";

type Audience = "INDIVIDUAL" | "ALL_VERIFIED_USERS";
type Mutation = { readonly reason: string; readonly idempotencyKey: string };
type IssueCouponInput = Mutation & { readonly campaignId: string; readonly audience: Audience; readonly email?: string; readonly confirmedCount: number; readonly confirmedToken: string };
type RevokeInput = Mutation & { readonly grantId: string };
type ReversePointInput = Mutation & { readonly sourceKey: string };

export class BenefitInputError extends Error {}

const isPrismaCode = (error: unknown, ...codes: readonly string[]): boolean => error instanceof Prisma.PrismaClientKnownRequestError && codes.includes(error.code);
const normalizedReason = (value: string): string => {
  const reason = value.trim();
  if (!reason || reason.length > 200) throw new BenefitInputError("감사 사유가 필요합니다.");
  return reason;
};

async function knownBrands(): Promise<string[]> {
  const rows = await prisma.product.findMany({ distinct: ["brand"], select: { brand: true }, orderBy: { brand: "asc" } });
  return rows.map((row) => row.brand);
}

const requestHash = (value: Readonly<Record<string, unknown>>): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function audienceSnapshot(campaignId: string, audience: Audience, email?: string) {
  const withoutCampaignGrant = { none: { campaignId } };
  const users = audience === "ALL_VERIFIED_USERS"
    ? await prisma.user.findMany({ where: { emailVerified: true, couponGrants: withoutCampaignGrant }, select: { id: true }, orderBy: { id: "asc" } })
    : await prisma.user.findMany({ where: { email: normalizeEmail(email ?? ""), emailVerified: true, couponGrants: withoutCampaignGrant }, select: { id: true }, orderBy: { id: "asc" } });
  const token = requestHash({ campaignId, audience, email: audience === "INDIVIDUAL" ? normalizeEmail(email ?? "") : null, userIds: users.map((user) => user.id) });
  return { users, count: users.length, token };
}

export async function listAdminBenefits() {
  const [campaignRows, policies, brands] = await Promise.all([
    prisma.couponCampaign.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { grants: true } }, grants: { take: 20, orderBy: { createdAt: "desc" }, select: { id: true, revokedAt: true } } } }),
    prisma.pointPolicy.findMany({ orderBy: { version: "desc" } }), knownBrands(),
  ]);
  const campaigns = campaignRows.map((campaign) => ({ ...campaign, grants: campaign.grants.map((grant) => ({ id: grant.id, revokedAt: grant.revokedAt })) }));
  const [manualGrants, reversals] = await Promise.all([
    prisma.pointLedgerEntry.findMany({ where: { type: "ADMIN_GRANT" }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, sourceKey: true, amount: true, createdAt: true, user: { select: { name: true } } } }),
    prisma.pointLedgerEntry.findMany({ where: { type: "ADMIN_REVERSAL", reversesSourceKey: { not: null } }, select: { reversesSourceKey: true } }),
  ]);
  const reversedKeys = new Set(reversals.flatMap((entry) => entry.reversesSourceKey ? [entry.reversesSourceKey] : []));
  return { campaigns, policies, brands, manualGrants: manualGrants.map((entry) => ({ ...entry, reversed: reversedKeys.has(entry.sourceKey) })) };
}

async function existingAudit(key: string, actorId: string, action: string, hash: string, targetId?: string) {
  const audit = await prisma.benefitAdminAudit.findUnique({ where: { idempotencyKey: key } });
  if (!audit) return null;
  if (audit.actorId !== actorId || audit.action !== action || audit.requestHash !== hash || (targetId && audit.targetId !== targetId)) throw new BenefitInputError("멱등 키가 다른 관리자 작업에 이미 사용되었습니다.");
  return audit;
}

export async function createCampaign(actorId: string, input: CampaignInput, key: string) {
  const parsed = parseCampaignInput(input, await knownBrands()); if (!parsed.ok) throw new BenefitInputError(parsed.error);
  const hash = requestHash({ actorId, ...parsed.value });
  const existing = await existingAudit(key, actorId, "CREATE_CAMPAIGN", hash);
  if (existing) return prisma.couponCampaign.findUnique({ where: { id: existing.targetId } });
  return prisma.$transaction(async (tx) => {
    const campaign = await tx.couponCampaign.create({ data: { ...parsed.value, brands: [...parsed.value.brands], expiresAt: parsed.value.expiresAt ? new Date(parsed.value.expiresAt) : null, creatorId: actorId } });
    await tx.benefitAdminAudit.create({ data: { action: "CREATE_CAMPAIGN", targetId: campaign.id, actorId, reason: parsed.value.reason, idempotencyKey: key, requestHash: hash } }); return campaign;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function updateCampaign(actorId: string, campaignId: string, input: CampaignInput, key: string) {
  const parsed = parseCampaignInput(input, await knownBrands()); if (!parsed.ok) throw new BenefitInputError(parsed.error);
  const hash = requestHash({ actorId, campaignId, ...parsed.value });
  const existing = await existingAudit(key, actorId, "UPDATE_CAMPAIGN", hash, campaignId); if (existing) return prisma.couponCampaign.findUnique({ where: { id: campaignId } });
  return prisma.$transaction(async (tx) => {
    const current = await tx.couponCampaign.findUnique({ where: { id: campaignId }, include: { _count: { select: { grants: true } } } });
    if (!current || current._count.grants > 0) throw new BenefitInputError("발급 전 캠페인만 수정할 수 있습니다.");
    const campaign = await tx.couponCampaign.update({ where: { id: campaignId }, data: { ...parsed.value, brands: [...parsed.value.brands], expiresAt: parsed.value.expiresAt ? new Date(parsed.value.expiresAt) : null } });
    await tx.benefitAdminAudit.create({ data: { action: "UPDATE_CAMPAIGN", targetId: campaignId, actorId, reason: parsed.value.reason, idempotencyKey: key, requestHash: hash } }); return campaign;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function deactivateCampaign(actorId: string, campaignId: string, mutation: Mutation) {
  const reason = normalizedReason(mutation.reason); const hash = requestHash({ actorId, campaignId, reason }); const existing = await existingAudit(mutation.idempotencyKey, actorId, "DEACTIVATE_CAMPAIGN", hash, campaignId);
  if (existing) return prisma.couponCampaign.findUnique({ where: { id: campaignId } });
  return prisma.$transaction(async (tx) => {
    const campaign = await tx.couponCampaign.update({ where: { id: campaignId }, data: { active: false } });
    await tx.benefitAdminAudit.create({ data: { action: "DEACTIVATE_CAMPAIGN", targetId: campaignId, actorId, reason, idempotencyKey: mutation.idempotencyKey, requestHash: hash } }); return campaign;
  });
}

export async function previewAudience(campaignId: string, audience: Audience, email?: string) {
  const snapshot = await audienceSnapshot(campaignId, audience, email); return { count: snapshot.count, token: snapshot.token };
}

function sameBatch(batch: { readonly requestHash: string; readonly actorId: string; readonly campaignId: string }, actorId: string, campaignId: string, hash: string): boolean {
  return batch.actorId === actorId && batch.campaignId === campaignId && batch.requestHash === hash;
}

export async function issueCoupon(actorId: string, input: IssueCouponInput) {
  const reason = normalizedReason(input.reason);
  const hash = requestHash({ actorId, campaignId: input.campaignId, audience: input.audience, email: input.audience === "INDIVIDUAL" ? normalizeEmail(input.email ?? "") : null, confirmedCount: input.confirmedCount, confirmedToken: input.confirmedToken, reason });
  const replay = await prisma.couponIssuanceBatch.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (replay) { if (!sameBatch(replay, actorId, input.campaignId, hash)) throw new BenefitInputError("멱등 키 충돌입니다."); return replay; }
  const snapshot = await audienceSnapshot(input.campaignId, input.audience, input.email);
  if (snapshot.count === 0 || snapshot.count !== input.confirmedCount || snapshot.token !== input.confirmedToken) throw new BenefitInputError("대상 스냅샷이 변경되었습니다. 다시 미리보기 하세요.");
  async function write(attempt: number): Promise<Awaited<ReturnType<typeof prisma.couponIssuanceBatch.create>>> {
    try { return await prisma.$transaction(async (tx) => {
      const existing = await tx.couponIssuanceBatch.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (existing) { if (!sameBatch(existing, actorId, input.campaignId, hash)) throw new BenefitInputError("멱등 키 충돌입니다."); return existing; }
      const campaign = await tx.couponCampaign.findUnique({ where: { id: input.campaignId }, select: { active: true, expiresAt: true } });
      if (!campaign?.active || (campaign.expiresAt && campaign.expiresAt <= new Date())) throw new BenefitInputError("활성 캠페인이 아닙니다.");
      const batch = await tx.couponIssuanceBatch.create({ data: { campaignId: input.campaignId, audience: input.audience, recipientCountSnapshot: snapshot.count, audienceDigest: snapshot.token, requestHash: hash, targetEmail: input.audience === "INDIVIDUAL" ? normalizeEmail(input.email ?? "") : null, actorId, reason, idempotencyKey: input.idempotencyKey } });
      const inserted = await tx.userCouponGrant.createMany({ data: snapshot.users.map((user) => ({ campaignId: input.campaignId, batchId: batch.id, userId: user.id })), skipDuplicates: true });
      if (inserted.count !== snapshot.count) throw new BenefitInputError("발급 대상이 변경되었습니다. 다시 미리보기 하세요.");
      return tx.couponIssuanceBatch.update({ where: { id: batch.id }, data: { status: "COMPLETED", completedAt: new Date() } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) { const existing = await prisma.couponIssuanceBatch.findUnique({ where: { idempotencyKey: input.idempotencyKey } }); if (existing) { if (!sameBatch(existing, actorId, input.campaignId, hash)) throw new BenefitInputError("멱등 키 충돌입니다."); return existing; } if (attempt < 2 && isPrismaCode(error, "P2002", "P2034")) return write(attempt + 1); throw error; }
  }
  return write(0);
}

export async function revokeCoupon(actorId: string, input: RevokeInput) {
  const reason = normalizedReason(input.reason); const hash = requestHash({ actorId, grantId: input.grantId, reason });
  const replay = await existingAudit(input.idempotencyKey, actorId, "REVOKE_COUPON", hash, input.grantId);
  if (replay) return prisma.userCouponGrant.findUnique({ where: { id: input.grantId } });
  return prisma.$transaction(async (tx) => {
    const grant = await tx.userCouponGrant.findUnique({ where: { id: input.grantId } });
    if (!grant) throw new BenefitInputError("쿠폰 발급을 찾을 수 없습니다.");
    if (grant.revokedAt) throw new BenefitInputError("이미 다른 회수 작업으로 처리되었습니다.");
    const result = await tx.userCouponGrant.updateMany({ where: { id: input.grantId, revokedAt: null }, data: { revokedAt: new Date(), revokedById: actorId, revocationReason: reason, revocationKey: input.idempotencyKey } });
    if (result.count !== 1) throw new BenefitInputError("동시 회수 충돌입니다.");
    await tx.benefitAdminAudit.create({ data: { action: "REVOKE_COUPON", targetId: input.grantId, actorId, reason, idempotencyKey: input.idempotencyKey, requestHash: hash } });
    return tx.userCouponGrant.findUnique({ where: { id: input.grantId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function createPointPolicy(actorId: string, input: PointPolicyInput, key: string) {
  const parsed = parsePointPolicyInput(input, await knownBrands()); if (!parsed.ok) throw new BenefitInputError(parsed.error);
  const hash = requestHash({ actorId, ...parsed.value });
  const existing = await prisma.pointPolicy.findUnique({ where: { idempotencyKey: key } }); if (existing) { if (existing.creatorId !== actorId || existing.requestHash !== hash) throw new BenefitInputError("멱등 키 충돌입니다."); return existing; }
  return prisma.$transaction(async (tx) => {
    const latest = await tx.pointPolicy.findFirst({ orderBy: { version: "desc" }, select: { version: true } }); await tx.pointPolicy.updateMany({ where: { active: true }, data: { active: false, effectiveUntil: new Date() } });
    return tx.pointPolicy.create({ data: { ...parsed.value, brands: [...parsed.value.brands], effectiveFrom: parsed.value.effectiveFrom ? new Date(parsed.value.effectiveFrom) : new Date(), effectiveUntil: parsed.value.effectiveUntil ? new Date(parsed.value.effectiveUntil) : null, version: (latest?.version ?? 0) + 1, creatorId: actorId, idempotencyKey: key, requestHash: hash } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function grantPoints(actorId: string, input: ManualPointInput) {
  const parsed = parseManualPointInput(input); if (!parsed.ok) throw new BenefitInputError(parsed.error);
  const user = await prisma.user.findUnique({ where: { email: parsed.value.email }, select: { id: true } }); if (!user) throw new BenefitInputError("사용자를 찾을 수 없습니다.");
  const existing = await prisma.pointLedgerEntry.findUnique({ where: { sourceKey: parsed.value.idempotencyKey } }); if (existing) { if (existing.actorId !== actorId || existing.userId !== user.id || existing.type !== "ADMIN_GRANT" || existing.amount !== parsed.value.amount || existing.reason !== parsed.value.reason) throw new BenefitInputError("멱등 키 충돌입니다."); return existing; }
  try { return await prisma.pointLedgerEntry.create({ data: { userId: user.id, type: "ADMIN_GRANT", amount: parsed.value.amount, reason: parsed.value.reason, actorId, sourceKey: parsed.value.idempotencyKey } }); }
  catch (error) { if (isPrismaCode(error, "P2002")) return grantPoints(actorId, parsed.value); throw error; }
}

export async function reversePoints(actorId: string, input: ReversePointInput) {
  const reason = normalizedReason(input.reason); const original = await prisma.pointLedgerEntry.findUnique({ where: { sourceKey: input.sourceKey } });
  if (!original || original.type !== "ADMIN_GRANT") throw new BenefitInputError("회수할 관리자 지급 내역이 없습니다.");
  const existing = await prisma.pointLedgerEntry.findUnique({ where: { sourceKey: input.idempotencyKey } }); if (existing) { if (existing.actorId !== actorId || existing.userId !== original.userId || existing.type !== "ADMIN_REVERSAL" || existing.amount !== -original.amount || existing.reversesSourceKey !== original.sourceKey || existing.reason !== reason) throw new BenefitInputError("멱등 키 충돌입니다."); return existing; }
  const previous = await prisma.pointLedgerEntry.findUnique({ where: { reversesSourceKey: original.sourceKey } }); if (previous) throw new BenefitInputError("이미 회수된 지급입니다.");
  try { return await prisma.pointLedgerEntry.create({ data: { userId: original.userId, type: "ADMIN_REVERSAL", amount: -original.amount, reason, actorId, sourceKey: input.idempotencyKey, reversesSourceKey: original.sourceKey } }); }
  catch (error) { if (isPrismaCode(error, "P2002")) return reversePoints(actorId, input); throw error; }
}
