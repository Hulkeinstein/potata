ALTER TABLE "CouponIssuanceBatch" ADD COLUMN "requestHash" TEXT;
ALTER TABLE "BenefitAdminAudit" ADD COLUMN "requestHash" TEXT;
ALTER TABLE "PointPolicy" ADD COLUMN "requestHash" TEXT;

UPDATE "CouponIssuanceBatch" SET "requestHash" = encode(sha256(("campaignId" || ':' || "audience"::text || ':' || "audienceDigest" || ':' || "reason" || ':' || "actorId")::bytea), 'hex');
UPDATE "BenefitAdminAudit" SET "requestHash" = encode(sha256(("action" || ':' || "targetId" || ':' || "reason" || ':' || "actorId")::bytea), 'hex');
UPDATE "PointPolicy" SET "requestHash" = encode(sha256(("version"::text || ':' || "reason" || ':' || "creatorId")::bytea), 'hex');

ALTER TABLE "CouponIssuanceBatch" ALTER COLUMN "requestHash" SET NOT NULL;
ALTER TABLE "BenefitAdminAudit" ALTER COLUMN "requestHash" SET NOT NULL;
ALTER TABLE "PointPolicy" ALTER COLUMN "requestHash" SET NOT NULL;
