import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import { clientIp, consumeRateLimit, createDbRateLimitStore, rateLimitStorageKey, resetRateLimitsForTests } from "./rate-limit";

beforeEach(() => {
  resetRateLimitsForTests();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("consumeRateLimit (메모리 저장소)", () => {
  it("한도까지 허용하고 그 다음부터 막는다", async () => {
    expect(await consumeRateLimit("a", 2, 1000)).toBe(true);
    expect(await consumeRateLimit("a", 2, 1000)).toBe(true);
    expect(await consumeRateLimit("a", 2, 1000)).toBe(false);
  });

  it("키가 다르면 서로 영향을 주지 않는다", async () => {
    expect(await consumeRateLimit("a", 1, 1000)).toBe(true);
    expect(await consumeRateLimit("b", 1, 1000)).toBe(true);
  });

  it("막힌 동안의 시도는 한도를 더 소비하지 않아, 시간창이 지나면 즉시 풀린다", async () => {
    expect(await consumeRateLimit("a", 1, 1000)).toBe(true);
    expect(await consumeRateLimit("a", 1, 1000)).toBe(false);

    vi.advanceTimersByTime(1001);

    expect(await consumeRateLimit("a", 1, 1000)).toBe(true);
  });
});

/** $queryRaw 태그 템플릿 호출을 흉내 내는 가짜 DB — 키·시간창별로 count 를 센다. */
function fakeDb() {
  const counts = new Map<string, number>();
  const calls: { key: string; windowStart: Date; expiresAt: Date }[] = [];
  const cleanup = vi.fn<(sql: TemplateStringsArray, ...values: unknown[]) => Promise<number>>(async () => 0);
  const $queryRaw = vi.fn(async (_sql: TemplateStringsArray, key: string, windowStart: Date, expiresAt: Date) => {
    calls.push({ key, windowStart, expiresAt });
    const id = `${key}@${windowStart.getTime()}`;
    const next = (counts.get(id) ?? 0) + 1;
    counts.set(id, next);
    return [{ count: next }];
  });
  return { db: { $queryRaw, $executeRaw: cleanup } as unknown as Parameters<typeof createDbRateLimitStore>[0], calls, cleanup };
}

describe("createDbRateLimitStore", () => {
  beforeEach(() => {
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("고정 시간창의 count 가 한도 이하일 때만 허용한다", async () => {
    let now = 10_500;
    const { db, calls } = fakeDb();
    const store = createDbRateLimitStore(db, () => now);

    expect(await store.consume("k", 2, 1000)).toBe(true);
    expect(await store.consume("k", 2, 1000)).toBe(true);
    expect(await store.consume("k", 2, 1000)).toBe(false);
    expect(calls[0]).toMatchObject({ key: await rateLimitStorageKey("k", "test-secret"), windowStart: new Date(10_000), expiresAt: new Date(11_000) });

    now = 11_000; // 다음 시간창 → 새 행
    expect(await store.consume("k", 2, 1000)).toBe(true);
    expect(calls.at(-1)?.windowStart).toEqual(new Date(11_000));
  });

  it("만료 정리는 인스턴스마다 10분에 한 번, 1000행 상한으로만 돈다", async () => {
    let now = 1_000_000;
    const { db, cleanup } = fakeDb();
    const store = createDbRateLimitStore(db, () => now);

    await store.consume("k", 5, 1000);
    await store.consume("k", 5, 1000);
    expect(cleanup).toHaveBeenCalledTimes(1);
    const [sql, cutoff, batch] = cleanup.mock.calls[0]!;
    expect(sql.join("?")).toContain("LIMIT");
    expect(cutoff).toEqual(new Date(1_000_000));
    expect(batch).toBe(1000);

    now += 10 * 60 * 1000;
    await store.consume("k", 5, 1000);
    expect(cleanup).toHaveBeenCalledTimes(2);
  });

  it("정리가 상한(1000행)을 꽉 채우면 다음 호출에서 바로 이어서 지운다", async () => {
    const now = 1_000_000;
    const { db, cleanup } = fakeDb();
    cleanup.mockResolvedValueOnce(1000).mockResolvedValueOnce(1000).mockResolvedValueOnce(3);
    const store = createDbRateLimitStore(db, () => now);

    await store.consume("k", 5, 1000);
    await store.consume("k", 5, 1000);
    await store.consume("k", 5, 1000);
    expect(cleanup).toHaveBeenCalledTimes(3);

    await store.consume("k", 5, 1000); // 마지막 정리가 3행이라 밀린 행이 없다 → 10분 동안 쉰다
    expect(cleanup).toHaveBeenCalledTimes(3);
  });

  it("정리 DELETE 가 진행 중이면 같은 인스턴스의 동시 호출은 정리를 겹쳐 띄우지 않는다", async () => {
    const { db, cleanup } = fakeDb();
    let release!: (rows: number) => void;
    cleanup.mockImplementationOnce(() => new Promise<number>((resolve) => { release = resolve; }));
    const store = createDbRateLimitStore(db, () => 1_000_000);

    const pending = Array.from({ length: 5 }, () => store.consume("k", 10, 1000));
    await vi.waitFor(() => expect(cleanup).toHaveBeenCalledTimes(1));
    release(0);
    await Promise.all(pending);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("비밀값이 없으면 키를 만들지 않고 throw 한다", async () => {
    vi.stubEnv("NEXTAUTH_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");
    const { db } = fakeDb();
    await expect(createDbRateLimitStore(db).consume("k", 1, 1000)).rejects.toThrow("SECRET");
  });

  it("DB 가 count 를 돌려주지 않으면 조용히 허용하지 않고 throw 한다", async () => {
    const db = { $queryRaw: vi.fn(async () => []), $executeRaw: vi.fn() } as unknown as Parameters<typeof createDbRateLimitStore>[0];
    await expect(createDbRateLimitStore(db).consume("k", 1, 1000)).rejects.toThrow("count");
  });

  it("DB 오류는 그대로 전파한다(fail-closed)", async () => {
    const db = { $queryRaw: vi.fn(async () => { throw new Error("db down"); }), $executeRaw: vi.fn() } as unknown as Parameters<typeof createDbRateLimitStore>[0];
    await expect(createDbRateLimitStore(db).consume("k", 1, 1000)).rejects.toThrow("db down");
  });
});

describe("rateLimitStorageKey", () => {
  it("이메일이 든 키를 그대로 저장하지 않고 비밀값 HMAC-SHA256 hex 로 바꾼다", async () => {
    const stored = await rateLimitStorageKey("login:someone@example.com", "s1");
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
    expect(stored).not.toContain("example.com");
    expect(await rateLimitStorageKey("login:someone@example.com", "s1")).toBe(stored);
  });

  it("비밀값 없는 해시와 다르고 비밀값마다 달라 사전 대입으로 되돌릴 수 없다", async () => {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("view:p1:203.0.113.7"));
    const plain = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    const keyed = await rateLimitStorageKey("view:p1:203.0.113.7", "s1");
    expect(keyed).not.toBe(plain);
    expect(keyed).not.toBe(await rateLimitStorageKey("view:p1:203.0.113.7", "s2"));
  });
});

describe("RATE_LIMIT_STORE 선택", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("값이 올바르지 않으면 조용히 메모리로 가지 않고 throw 한다", async () => {
    vi.stubEnv("RATE_LIMIT_STORE", "redis");
    vi.resetModules();
    const mod = await import("./rate-limit");
    expect(() => mod.consumeRateLimit("k", 1, 1000)).toThrow("RATE_LIMIT_STORE");
  });

  it("db 면 공유 DB 카운터를 쓴다", async () => {
    vi.stubEnv("RATE_LIMIT_STORE", "db");
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret");
    vi.resetModules();
    const queryRaw = vi.fn(async () => [{ count: 1 }]);
    vi.doMock("@/lib/prisma", () => ({ prisma: { $queryRaw: queryRaw, $executeRaw: vi.fn(async () => 0) } }));
    const mod = await import("./rate-limit");
    expect(await mod.consumeRateLimit("k", 1, 1000)).toBe(true);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    vi.doUnmock("@/lib/prisma");
  });

  it("production 에서 미설정이면 경고를 남기고 메모리로 동작한다", async () => {
    vi.stubEnv("RATE_LIMIT_STORE", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mod = await import("./rate-limit");
    expect(await mod.consumeRateLimit("k", 1, 1000)).toBe(true);
    expect(await mod.consumeRateLimit("k", 1, 1000)).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe("clientIp", () => {
  it("x-forwarded-for의 첫 주소를 쓴다", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    expect(clientIp({ headers })).toBe("203.0.113.7");
  });

  it("헤더가 없으면 unknown", () => {
    expect(clientIp({ headers: new Headers() })).toBe("unknown");
  });
});
