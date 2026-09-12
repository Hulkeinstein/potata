CREATE TYPE "LegalDocumentType" AS ENUM ('TERMS', 'PRIVACY', 'MARKETING');
CREATE TYPE "LegalDocumentStatus" AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TYPE "ConsentAction" AS ENUM ('GRANT', 'WITHDRAW');

ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
UPDATE "User" SET "onboardingCompletedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP)
WHERE "handle" IS NOT NULL AND length(trim("name")) > 0;

CREATE TABLE "LegalDocumentVersion" (
  "id" TEXT NOT NULL,
  "type" "LegalDocumentType" NOT NULL,
  "version" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "status" "LegalDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegalDocumentVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserConsent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "documentVersionId" TEXT NOT NULL,
  "action" "ConsentAction" NOT NULL,
  "source" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegalDocumentVersion_type_version_locale_key" ON "LegalDocumentVersion"("type", "version", "locale");
CREATE INDEX "LegalDocumentVersion_type_status_idx" ON "LegalDocumentVersion"("type", "status");
CREATE INDEX "UserConsent_userId_occurredAt_idx" ON "UserConsent"("userId", "occurredAt");
CREATE INDEX "UserConsent_documentVersionId_occurredAt_idx" ON "UserConsent"("documentVersionId", "occurredAt");
ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "LegalDocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
