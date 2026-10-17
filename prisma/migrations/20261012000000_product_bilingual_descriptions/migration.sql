-- 기존 description 원문은 보존하고 언어를 추정하지 않습니다.
ALTER TABLE "Product" ADD COLUMN "descriptionKo" TEXT,
                      ADD COLUMN "descriptionEn" TEXT;
