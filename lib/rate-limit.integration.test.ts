import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createDbRateLimitStore, rateLimitStorageKey } from "./rate-limit";

// 실제 Postgres 에서 RateLimitBucket upsert 가 인스턴스 간 공유·동시성에 정확한지 확인한다.
// 실행: RUN_INTEGRATION=1 + migration 이 적용된 로컬/CI DB.
const runIntegration = process.env.RUN_INTEGRATION === "1";
const prefix = `it-rate-limit:${crypto.randomUUID()}:`;
const usedKeys: string[] = [];

afterEach(async () => {
  if (!runIntegration || usedKeys.length === 0) return;
  const stored = await Promise.all(usedKeys.splice(0).map((key) => rateLimitStorageKey(key)));
  await prisma.rateLimitBucket.deleteMany({ where: { key: { in: stored } } });
});

describe.skipIf(!runIntegration)("RateLimitBucket 공유 카운터", () => {
  it("서로 다른 store(인스턴스)가 같은 키의 한도를 공유한다", async () => {
    const a = createDbRateLimitStore();
    const b = createDbRateLimitStore();
    const key = `${prefix}shared`;
    usedKeys.push(key);
    expect(await a.consume(key, 2, 60_000)).toBe(true);
    expect(await b.consume(key, 2, 60_000)).toBe(true);
    expect(await a.consume(key, 2, 60_000)).toBe(false);
    expect(await b.consume(key, 2, 60_000)).toBe(false);
  });

  it("동시 요청 20건 중 정확히 limit(5)건만 허용한다", async () => {
    const key = `${prefix}race`;
    usedKeys.push(key);
    const stores = Array.from({ length: 4 }, () => createDbRateLimitStore());
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => stores[i % 4]!.consume(key, 5, 60_000)));
    expect(results.filter(Boolean)).toHaveLength(5);
  });
});
