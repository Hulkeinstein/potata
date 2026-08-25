import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createCampaign, createPointPolicy, grantPoints, issueCoupon, previewAudience, reversePoints } from "./admin-service";
import { getOwnedBenefits } from "./read-service";

const RUN = process.env.RUN_INTEGRATION === "1";
const LOCAL_DATABASE_PATTERN = /(?:localhost|127\.0\.0\.1)(?::\d+)?\/potata_dev(?:\?|$)/;
const EMAILS = ["benefit-admin@example.test", "benefit-a@example.test", "benefit-b@example.test", "benefit-unverified@example.test"] as const;
let actorId = "";
let ownerId = "";
let campaignId = "";

beforeAll(async () => {
  if (!RUN) return;
  if (!LOCAL_DATABASE_PATTERN.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("Integration tests require the local potata_dev database.");
  }
  const old = await prisma.user.findMany({ where: { email: { in: [...EMAILS] } }, select: { id: true } });
  const ids = old.map((user) => user.id);
  const campaigns = await prisma.couponCampaign.findMany({ where: { creatorId: { in: ids } }, select: { id: true } });
  const campaignIds = campaigns.map((campaign) => campaign.id);
  await prisma.pointLedgerEntry.deleteMany({ where: { userId: { in: ids } } });
  await prisma.benefitAdminAudit.deleteMany({ where: { actorId: { in: ids } } });
  await prisma.userCouponGrant.deleteMany({ where: { OR: [{ userId: { in: ids } }, { campaignId: { in: campaignIds } }] } });
  await prisma.couponIssuanceBatch.deleteMany({ where: { actorId: { in: ids } } });
  await prisma.couponCampaign.deleteMany({ where: { creatorId: { in: ids } } });
  await prisma.pointPolicy.deleteMany({ where: { creatorId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.product.upsert({ where: { id: "benefit-itest-product" }, create: { id: "benefit-itest-product", name: "Benefit Test", brand: "Benefit Brand", price: 100, imageUrl: "https://example.test/item.png", category: "Top" }, update: {} });
  const users = await Promise.all(EMAILS.map((email, index) => prisma.user.create({ data: { email, name: `Benefit ${index}`, emailVerified: index < 3 } })));
  actorId = users[0]?.id ?? "";
  ownerId = users[1]?.id ?? "";
});

afterAll(async () => {
  if (!RUN) return;
  const users = await prisma.user.findMany({ where: { email: { in: [...EMAILS] } }, select: { id: true } });
  const ids = users.map((user) => user.id);
  const campaigns = await prisma.couponCampaign.findMany({ where: { creatorId: { in: ids } }, select: { id: true } });
  const campaignIds = campaigns.map((campaign) => campaign.id);
  await prisma.pointLedgerEntry.deleteMany({ where: { userId: { in: ids } } });
  await prisma.benefitAdminAudit.deleteMany({ where: { actorId: { in: ids } } });
  await prisma.userCouponGrant.deleteMany({ where: { OR: [{ userId: { in: ids } }, { campaignId: { in: campaignIds } }] } });
  await prisma.couponIssuanceBatch.deleteMany({ where: { actorId: { in: ids } } });
  await prisma.couponCampaign.deleteMany({ where: { creatorId: { in: ids } } });
  await prisma.pointPolicy.deleteMany({ where: { creatorId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.product.deleteMany({ where: { id: "benefit-itest-product" } });
  await prisma.$disconnect();
});

describe.skipIf(!RUN)("benefits local PostgreSQL", () => {
  it("캠페인과 전체 인증 사용자 스냅샷을 한 번만 발급한다", async () => {
    const campaign = await createCampaign(actorId, { name: "Integration pilot", ratePercent: 15, minOrderAed: 100, maxDiscountAed: 50, scope: "BRANDS", brands: ["Benefit Brand"], reason: "integration" }, "benefit-itest-campaign");
    if (!campaign) throw new Error("Campaign creation did not return a campaign.");
    campaignId = campaign.id;
    const preview = await previewAudience(campaignId, "ALL_VERIFIED_USERS");
    const input = { campaignId, audience: "ALL_VERIFIED_USERS" as const, confirmedCount: preview.count, confirmedToken: preview.token, reason: "integration issue", idempotencyKey: "benefit-itest-issue" };
    const results = await Promise.allSettled([issueCoupon(actorId, input), issueCoupon(actorId, input)]);
    const rejection = results.find((result) => result.status === "rejected");
    if (rejection?.status === "rejected") throw rejection.reason;
    expect(results.every((result) => result.status === "fulfilled")).toBe(true);
    expect(await prisma.couponIssuanceBatch.count({ where: { idempotencyKey: input.idempotencyKey } })).toBe(1);
    expect(await prisma.userCouponGrant.count({ where: { campaignId } })).toBe(preview.count);
    const sequentialReplay = await issueCoupon(actorId, input);
    expect(sequentialReplay.idempotencyKey).toBe(input.idempotencyKey);
  });

  it("포인트 정책은 저장만 하고 수동 지급·회수를 append-only로 합산한다", async () => {
    const ordersBefore = await prisma.order.count({ where: { userId: ownerId } });
    await createPointPolicy(actorId, { rateBasisPoints: 300, perOrderCap: 100, scope: "ALL_PRODUCTS", brands: [], activationEvent: "PURCHASE_CONFIRMED", reason: "future only" }, "benefit-itest-policy");
    await Promise.all([grantPoints(actorId, { email: EMAILS[1], amount: 100, reason: "manual", idempotencyKey: "benefit-itest-point" }), grantPoints(actorId, { email: EMAILS[1], amount: 100, reason: "manual", idempotencyKey: "benefit-itest-point" })]);
    await expect(grantPoints(ownerId, { email: EMAILS[1], amount: 100, reason: "manual", idempotencyKey: "benefit-itest-point" })).rejects.toThrow("멱등 키 충돌");
    await reversePoints(actorId, { sourceKey: "benefit-itest-point", reason: "correction", idempotencyKey: "benefit-itest-reverse" });
    await expect(reversePoints(ownerId, { sourceKey: "benefit-itest-point", reason: "correction", idempotencyKey: "benefit-itest-reverse" })).rejects.toThrow("멱등 키 충돌");
    const benefits = await getOwnedBenefits(ownerId);
    expect(benefits.points.balance).toBe(0);
    expect(benefits.points.entries).toHaveLength(2);
    expect(await prisma.pointLedgerEntry.count({ where: { type: "PURCHASE_EARN" } })).toBe(0);
    expect(await prisma.order.count({ where: { userId: ownerId } })).toBe(ordersBefore);
  });
});
