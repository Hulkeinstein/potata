ALTER TABLE "Product" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "Product_isActive_createdAt_idx" ON "Product"("isActive", "createdAt");
