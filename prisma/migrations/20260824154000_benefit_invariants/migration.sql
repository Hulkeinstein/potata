CREATE UNIQUE INDEX "PointLedgerEntry_reversesSourceKey_key" ON "PointLedgerEntry"("reversesSourceKey");

ALTER TABLE "CouponCampaign" ADD CONSTRAINT "CouponCampaign_rate_check" CHECK ("ratePercent" BETWEEN 1 AND 100);
ALTER TABLE "CouponCampaign" ADD CONSTRAINT "CouponCampaign_max_discount_check" CHECK ("maxDiscountAed" > 0);
ALTER TABLE "CouponCampaign" ADD CONSTRAINT "CouponCampaign_scope_check" CHECK (("scope" = 'ALL_PRODUCTS' AND cardinality("brands") = 0) OR ("scope" = 'BRANDS' AND cardinality("brands") > 0));
ALTER TABLE "CouponCampaign" ADD CONSTRAINT "CouponCampaign_reason_check" CHECK (length(btrim("reason")) > 0);
ALTER TABLE "CouponIssuanceBatch" ADD CONSTRAINT "CouponIssuanceBatch_recipient_count_check" CHECK ("recipientCountSnapshot" > 0);
ALTER TABLE "CouponIssuanceBatch" ADD CONSTRAINT "CouponIssuanceBatch_reason_check" CHECK (length(btrim("reason")) > 0);
ALTER TABLE "PointPolicy" ADD CONSTRAINT "PointPolicy_rate_check" CHECK ("rateBasisPoints" BETWEEN 1 AND 10000);
ALTER TABLE "PointPolicy" ADD CONSTRAINT "PointPolicy_cap_check" CHECK ("perOrderCap" > 0);
ALTER TABLE "PointPolicy" ADD CONSTRAINT "PointPolicy_scope_check" CHECK (("scope" = 'ALL_PRODUCTS' AND cardinality("brands") = 0) OR ("scope" = 'BRANDS' AND cardinality("brands") > 0));
ALTER TABLE "PointPolicy" ADD CONSTRAINT "PointPolicy_activation_check" CHECK ("activationEvent" = 'PURCHASE_CONFIRMED');
ALTER TABLE "PointPolicy" ADD CONSTRAINT "PointPolicy_reason_check" CHECK (length(btrim("reason")) > 0);
ALTER TABLE "PointLedgerEntry" ADD CONSTRAINT "PointLedgerEntry_amount_check" CHECK (("type" IN ('ADMIN_GRANT', 'PURCHASE_EARN') AND "amount" > 0) OR ("type" = 'ADMIN_REVERSAL' AND "amount" < 0));
ALTER TABLE "PointLedgerEntry" ADD CONSTRAINT "PointLedgerEntry_source_check" CHECK (("type" IN ('ADMIN_GRANT', 'ADMIN_REVERSAL') AND "actorId" IS NOT NULL AND "trustedOrderId" IS NULL) OR ("type" = 'PURCHASE_EARN' AND "actorId" IS NULL AND "trustedOrderId" IS NOT NULL));
ALTER TABLE "PointLedgerEntry" ADD CONSTRAINT "PointLedgerEntry_reason_check" CHECK (length(btrim("reason")) > 0);
