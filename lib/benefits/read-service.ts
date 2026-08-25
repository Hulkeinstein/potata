import { prisma } from "@/lib/prisma";
import { couponGrantStatus } from "./status";

export async function getOwnedBenefits(userId: string, cursor?: string) {
  const now = new Date();
  if (cursor) {
    const ownedCursor = await prisma.pointLedgerEntry.findFirst({ where: { id: cursor, userId }, select: { id: true } });
    if (!ownedCursor) throw new Error("Invalid benefits cursor");
  }
  const [grants, entries, aggregate] = await Promise.all([
    prisma.userCouponGrant.findMany({ where: { userId }, include: { campaign: true }, orderBy: { createdAt: "desc" } }),
    prisma.pointLedgerEntry.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 21, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) }),
    prisma.pointLedgerEntry.aggregate({ where: { userId }, _sum: { amount: true } }),
  ]);
  const page = entries.slice(0, 20);
  return {
    coupons: grants.map((grant) => ({
      id: grant.id,
      name: grant.campaign.name,
      ratePercent: grant.campaign.ratePercent,
      minOrderAed: grant.campaign.minOrderAed,
      maxDiscountAed: grant.campaign.maxDiscountAed,
      scope: grant.campaign.scope,
      brands: grant.campaign.brands,
      status: couponGrantStatus({ revokedAt: grant.revokedAt, expiresAt: grant.campaign.expiresAt }, now),
      expiresAt: grant.campaign.expiresAt?.toISOString() ?? null,
    })),
    points: { balance: aggregate._sum.amount ?? 0, entries: page.map((entry) => ({ id: entry.id, type: entry.type, amount: entry.amount, label: entry.type === "ADMIN_GRANT" ? "관리자 포인트 지급" : entry.type === "ADMIN_REVERSAL" ? "포인트 지급 취소" : "구매 포인트 적립", createdAt: entry.createdAt.toISOString() })), nextCursor: entries.length > 20 ? page.at(-1)?.id ?? null : null },
  };
}
