ALTER TABLE "UserCouponGrant" ADD COLUMN "revocationKey" TEXT;
ALTER TABLE "PointPolicy" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "CouponIssuanceBatch" ADD COLUMN "audienceDigest" TEXT;

UPDATE "PointPolicy" SET "idempotencyKey" = 'policy-backfill-' || "id" WHERE "idempotencyKey" IS NULL;
ALTER TABLE "PointPolicy" ALTER COLUMN "idempotencyKey" SET NOT NULL;
UPDATE "CouponIssuanceBatch" SET "audienceDigest" = 'legacy:' || "id" WHERE "audienceDigest" IS NULL;
ALTER TABLE "CouponIssuanceBatch" ALTER COLUMN "audienceDigest" SET NOT NULL;

CREATE TABLE "BenefitAdminAudit" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BenefitAdminAudit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserCouponGrant_revocationKey_key" ON "UserCouponGrant"("revocationKey");
CREATE UNIQUE INDEX "PointPolicy_idempotencyKey_key" ON "PointPolicy"("idempotencyKey");
CREATE UNIQUE INDEX "BenefitAdminAudit_idempotencyKey_key" ON "BenefitAdminAudit"("idempotencyKey");
CREATE INDEX "BenefitAdminAudit_targetId_createdAt_idx" ON "BenefitAdminAudit"("targetId", "createdAt");
CREATE INDEX "BenefitAdminAudit_actorId_createdAt_idx" ON "BenefitAdminAudit"("actorId", "createdAt");
ALTER TABLE "BenefitAdminAudit" ADD CONSTRAINT "BenefitAdminAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BenefitAdminAudit" ADD CONSTRAINT "BenefitAdminAudit_reason_check" CHECK (length(btrim("reason")) > 0);
