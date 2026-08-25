ALTER TABLE "CouponCampaign" ADD COLUMN "minOrderAed" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "CouponCampaign" ALTER COLUMN "minOrderAed" DROP DEFAULT;
ALTER TABLE "CouponCampaign" ADD CONSTRAINT "CouponCampaign_min_order_positive" CHECK ("minOrderAed" > 0);

CREATE TABLE "AdminStepUpProof" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminStepUpProof_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminStepUpProof_tokenHash_key" ON "AdminStepUpProof"("tokenHash");
CREATE INDEX "AdminStepUpProof_actorId_expiresAt_idx" ON "AdminStepUpProof"("actorId", "expiresAt");
ALTER TABLE "AdminStepUpProof" ADD CONSTRAINT "AdminStepUpProof_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
