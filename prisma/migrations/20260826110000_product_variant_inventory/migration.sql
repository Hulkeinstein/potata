CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "size" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isManuallySoldOut" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductVariant_stock_nonnegative" CHECK ("stock" >= 0)
);

CREATE UNIQUE INDEX "ProductVariant_productId_size_color_key" ON "ProductVariant"("productId", "size", "color");
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing products deliberately begin at zero inventory: the admin must enter
-- authoritative stock counts before customers can purchase an option.
INSERT INTO "ProductVariant" ("id", "productId", "size", "color", "stock", "isManuallySoldOut", "updatedAt")
SELECT
  md5("Product"."id" || ':' || size_option || ':' || color_option),
  "Product"."id",
  size_option,
  color_option,
  0,
  false,
  CURRENT_TIMESTAMP
FROM "Product"
CROSS JOIN LATERAL unnest(CASE WHEN cardinality("Product"."sizes") > 0 THEN "Product"."sizes" ELSE ARRAY['']::TEXT[] END) AS size_option
CROSS JOIN LATERAL unnest(CASE WHEN cardinality("Product"."colors") > 0 THEN "Product"."colors" ELSE ARRAY['']::TEXT[] END) AS color_option;
