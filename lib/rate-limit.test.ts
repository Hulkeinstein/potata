import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import { clientIp, consumeRateLimit, resetRateLimitsForTests } from "./rate-limit";

beforeEach(() => {
  resetRateLimitsForTests();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("consumeRateLimit", () => {
  it("한도까지 허용하고 그 다음부터 막는다", () => {
    expect(consumeRateLimit("a", 2, 1000)).toBe(true);
    expect(consumeRateLimit("a", 2, 1000)).toBe(true);
    expect(consumeRateLimit("a", 2, 1000)).toBe(false);
  });

  it("키가 다르면 서로 영향을 주지 않는다", () => {
    expect(consumeRateLimit("a", 1, 1000)).toBe(true);
    expect(consumeRateLimit("b", 1, 1000)).toBe(true);
  });

  it("막힌 동안의 시도는 한도를 더 소비하지 않아, 시간창이 지나면 즉시 풀린다", () => {
    expect(consumeRateLimit("a", 1, 1000)).toBe(true);
    expect(consumeRateLimit("a", 1, 1000)).toBe(false);

    vi.advanceTimersByTime(1001);

    expect(consumeRateLimit("a", 1, 1000)).toBe(true);
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
