-- 공유 rate limit 카운터(고정 시간창). RATE_LIMIT_STORE=db 일 때 lib/rate-limit.ts 가 사용한다.
-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateIndex
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- Supabase Data API 노출 차단(20260918120000_enable_rls_public_tables 와 같은 규칙, rls-coverage.test.ts 가 강제)
ALTER TABLE "RateLimitBucket" ENABLE ROW LEVEL SECURITY;
