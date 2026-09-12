ALTER TABLE "UserSettings" ADD COLUMN "heightCm" DOUBLE PRECISION;
ALTER TABLE "UserSettings" ADD COLUMN "weightKg" DOUBLE PRECISION;
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_heightCm_range_check" CHECK ("heightCm" IS NULL OR ("heightCm" >= 100 AND "heightCm" <= 250));
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_weightKg_range_check" CHECK ("weightKg" IS NULL OR ("weightKg" >= 25 AND "weightKg" <= 300));
