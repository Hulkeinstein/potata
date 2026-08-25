CREATE TYPE "BenefitScope" AS ENUM ('ALL_PRODUCTS', 'BRANDS');
CREATE TYPE "CouponAudience" AS ENUM ('INDIVIDUAL', 'ALL_VERIFIED_USERS');
CREATE TYPE "CouponBatchStatus" AS ENUM ('PENDING', 'COMPLETED');
CREATE TYPE "PointLedgerType" AS ENUM ('ADMIN_GRANT', 'ADMIN_REVERSAL', 'PURCHASE_EARN');

CREATE TABLE "CouponCampaign" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "ratePercent" INTEGER NOT NULL,
  "maxDiscountAed" INTEGER NOT NULL, "scope" "BenefitScope" NOT NULL,
  "brands" TEXT[] DEFAULT ARRAY[]::TEXT[], "active" BOOLEAN NOT NULL DEFAULT true,
  "reason" TEXT NOT NULL, "expiresAt" TIMESTAMP(3), "creatorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CouponCampaign_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CouponIssuanceBatch" (
  "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "audience" "CouponAudience" NOT NULL,
  "recipientCountSnapshot" INTEGER NOT NULL, "targetEmail" TEXT, "actorId" TEXT NOT NULL,
  "reason" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL, "status" "CouponBatchStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
  CONSTRAINT "CouponIssuanceBatch_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UserCouponGrant" (
  "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "batchId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "revokedAt" TIMESTAMP(3), "revokedById" TEXT, "revocationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserCouponGrant_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PointPolicy" (
  "id" TEXT NOT NULL, "version" INTEGER NOT NULL, "rateBasisPoints" INTEGER NOT NULL,
  "perOrderCap" INTEGER NOT NULL, "scope" "BenefitScope" NOT NULL, "brands" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "activationEvent" TEXT NOT NULL DEFAULT 'PURCHASE_CONFIRMED', "active" BOOLEAN NOT NULL DEFAULT true,
  "reason" TEXT NOT NULL, "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveUntil" TIMESTAMP(3), "creatorId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PointPolicy_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PointLedgerEntry" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" "PointLedgerType" NOT NULL, "amount" INTEGER NOT NULL,
  "reason" TEXT NOT NULL, "actorId" TEXT, "trustedOrderId" TEXT, "sourceKey" TEXT NOT NULL,
  "reversesSourceKey" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PointLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CouponIssuanceBatch_idempotencyKey_key" ON "CouponIssuanceBatch"("idempotencyKey");
CREATE UNIQUE INDEX "UserCouponGrant_campaignId_userId_key" ON "UserCouponGrant"("campaignId", "userId");
CREATE UNIQUE INDEX "PointPolicy_version_key" ON "PointPolicy"("version");
CREATE UNIQUE INDEX "PointLedgerEntry_sourceKey_key" ON "PointLedgerEntry"("sourceKey");
CREATE INDEX "CouponCampaign_active_createdAt_idx" ON "CouponCampaign"("active", "createdAt");
CREATE INDEX "CouponCampaign_scope_idx" ON "CouponCampaign"("scope");
CREATE INDEX "CouponCampaign_expiresAt_idx" ON "CouponCampaign"("expiresAt");
CREATE INDEX "CouponIssuanceBatch_campaignId_createdAt_idx" ON "CouponIssuanceBatch"("campaignId", "createdAt");
CREATE INDEX "CouponIssuanceBatch_actorId_createdAt_idx" ON "CouponIssuanceBatch"("actorId", "createdAt");
CREATE INDEX "UserCouponGrant_userId_createdAt_idx" ON "UserCouponGrant"("userId", "createdAt");
CREATE INDEX "UserCouponGrant_userId_revokedAt_idx" ON "UserCouponGrant"("userId", "revokedAt");
CREATE INDEX "UserCouponGrant_batchId_idx" ON "UserCouponGrant"("batchId");
CREATE INDEX "PointPolicy_active_effectiveFrom_idx" ON "PointPolicy"("active", "effectiveFrom");
CREATE INDEX "PointLedgerEntry_userId_createdAt_id_idx" ON "PointLedgerEntry"("userId", "createdAt", "id");
CREATE INDEX "PointLedgerEntry_type_createdAt_idx" ON "PointLedgerEntry"("type", "createdAt");

ALTER TABLE "CouponCampaign" ADD CONSTRAINT "CouponCampaign_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CouponIssuanceBatch" ADD CONSTRAINT "CouponIssuanceBatch_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CouponCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CouponIssuanceBatch" ADD CONSTRAINT "CouponIssuanceBatch_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserCouponGrant" ADD CONSTRAINT "UserCouponGrant_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CouponCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserCouponGrant" ADD CONSTRAINT "UserCouponGrant_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "CouponIssuanceBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserCouponGrant" ADD CONSTRAINT "UserCouponGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCouponGrant" ADD CONSTRAINT "UserCouponGrant_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PointPolicy" ADD CONSTRAINT "PointPolicy_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PointLedgerEntry" ADD CONSTRAINT "PointLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PointLedgerEntry" ADD CONSTRAINT "PointLedgerEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
