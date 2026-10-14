/**
 * 공용 rate limit — 같은 키의 호출을 시간창 안에서 제한한다.
 *
 * 저장소는 env `RATE_LIMIT_STORE` 로 명시적으로 고른다.
 * - `db`: 공유 DB 카운터(RateLimitBucket, 고정 시간창). 인스턴스가 여러 개여도 한도가 하나다.
 *         DB 오류는 그대로 throw 한다(fail-closed — 호출한 route 가 500 을 돌려준다).
 * - `memory` 또는 미설정: 프로세스 메모리(sliding window). 인스턴스가 여러 개면 "인스턴스당" 한도가 된다.
 *         운영 DB 에 RateLimitBucket migration 을 적용하기 전에도 배포가 깨지지 않도록 미설정의 기본값이다.
 *         production 에서 미설정이면 최초 1회 경고를 남긴다.
 * 계획: docs/work-plans/shared-rate-limit.md
 */

import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type RateLimitStore = {
  /** 호출 1회를 센다. 한도 안이면 true. */
  consume(key: string, limit: number, windowMs: number): Promise<boolean>;
};

const MAX_TRACKED_KEYS = 10_000;

/** 메모리 sliding window. 막힌 호출은 소비하지 않아 시간창이 지나면 즉시 풀린다. */
export function createMemoryRateLimitStore(now: () => number = () => Date.now()): RateLimitStore {
  const buckets = new Map<string, number[]>();
  return {
    async consume(key, limit, windowMs) {
      const at = now();
      const recent = (buckets.get(key) ?? []).filter((t) => at - t < windowMs);
      if (recent.length >= limit) {
        buckets.set(key, recent);
        return false;
      }
      buckets.set(key, [...recent, at]);
      if (buckets.size > MAX_TRACKED_KEYS) {
        for (const [tracked, times] of buckets) {
          if (times.every((t) => at - t >= windowMs)) buckets.delete(tracked);
        }
      }
      return true;
    },
  };
}

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

type RateLimitDb = Pick<PrismaClient, "$queryRaw" | "rateLimitBucket">;

/**
 * DB 에 저장하는 키. 원래 키에는 이메일·IP 가 들어 있으므로 SHA-256 hex 로만 남긴다(개인정보를 DB 에 두지 않는다).
 * Web Crypto 를 쓴다 — middleware 가 Edge 로 돌아가도 깨지지 않게 node:crypto 를 피한다.
 */
export async function rateLimitStorageKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * DB 고정 시간창 카운터. `INSERT … ON CONFLICT … RETURNING` 한 문장이라 동시 요청에도 정확히 센다.
 * 시간창 경계에서는 최대 2배 burst 가 가능하다(1차 방어선 용도라 허용).
 */
export function createDbRateLimitStore(db: RateLimitDb = prisma, now: () => number = () => Date.now()): RateLimitStore {
  let lastCleanupAt = 0;
  return {
    async consume(key, limit, windowMs) {
      const at = now();
      const windowStart = new Date(Math.floor(at / windowMs) * windowMs);
      const expiresAt = new Date(windowStart.getTime() + windowMs);
      const storageKey = await rateLimitStorageKey(key);
      const rows = await db.$queryRaw<{ count: number }[]>`
        INSERT INTO "RateLimitBucket" ("key", "windowStart", "count", "expiresAt")
        VALUES (${storageKey}, ${windowStart}, 1, ${expiresAt})
        ON CONFLICT ("key", "windowStart") DO UPDATE SET "count" = "RateLimitBucket"."count" + 1
        RETURNING "count"`;
      const count = rows[0]?.count;
      if (typeof count !== "number") throw new Error("RateLimitBucket upsert가 count를 돌려주지 않았습니다");

      // 만료 행 정리 — 인스턴스마다 최대 10분에 한 번. 실패하면 위 DB 오류와 같이 throw 한다.
      if (at - lastCleanupAt >= CLEANUP_INTERVAL_MS) {
        lastCleanupAt = at;
        await db.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date(at) } } });
      }
      return count <= limit;
    },
  };
}

let store: RateLimitStore | null = null;

function resolveStore(): RateLimitStore {
  if (store) return store;
  const mode = process.env.RATE_LIMIT_STORE?.trim() ?? "";
  if (mode === "db") return (store = createDbRateLimitStore());
  if (mode !== "" && mode !== "memory") {
    throw new Error(`RATE_LIMIT_STORE 값이 올바르지 않습니다: "${mode}" (db | memory)`);
  }
  if (mode === "" && process.env.NODE_ENV === "production") {
    console.warn("[rate-limit] RATE_LIMIT_STORE 미설정 — 메모리 저장소(인스턴스당 한도)로 동작합니다.");
  }
  return (store = createMemoryRateLimitStore());
}

/** 호출을 1회 소비한다. 한도를 넘으면 false. */
export function consumeRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  return resolveStore().consume(key, limit, windowMs);
}

/** 테스트용: 새 메모리 저장소로 교체한다(env 와 무관). */
export function resetRateLimitsForTests(): void {
  store = createMemoryRateLimitStore();
}

/** 프록시 뒤에서의 호출자 IP. 알 수 없으면 "unknown"(공유 버킷으로 묶인다). */
export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",", 1)[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
