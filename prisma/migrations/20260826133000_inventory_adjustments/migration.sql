CREATE TYPE "InventoryAdjustmentType" AS ENUM ('RECEIVE', 'CORRECTION', 'DISPOSAL');

CREATE TABLE "InventoryAdjustment" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" "InventoryAdjustmentType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "stockBefore" INTEGER NOT NULL,
    "stockAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryAdjustment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InventoryAdjustment_delta_nonzero" CHECK ("delta" <> 0),
    CONSTRAINT "InventoryAdjustment_stock_nonnegative" CHECK ("stockBefore" >= 0 AND "stockAfter" >= 0),
    CONSTRAINT "InventoryAdjustment_after_matches_delta" CHECK ("stockAfter" = "stockBefore" + "delta")
);

CREATE UNIQUE INDEX "InventoryAdjustment_idempotencyKey_key" ON "InventoryAdjustment"("idempotencyKey");
CREATE INDEX "InventoryAdjustment_variantId_createdAt_idx" ON "InventoryAdjustment"("variantId", "createdAt");
CREATE INDEX "InventoryAdjustment_actorId_createdAt_idx" ON "InventoryAdjustment"("actorId", "createdAt");

ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
