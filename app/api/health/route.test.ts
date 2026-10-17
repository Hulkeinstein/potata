import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryRaw } = vi.hoisted(() => ({ queryRaw: vi.fn() }));

// 실 DB 접근 금지 — $queryRaw 결과만 흉내 낸다
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: queryRaw } }));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DB 가 응답하면 200 과 ok: true 를 돌려주고 캐시하지 않는다", async () => {
    queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, db: "ok" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it("DB 오류면 503 이고, 오류 내용은 응답에 싣지 않는다", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    queryRaw.mockRejectedValue(new Error("connect ECONNREFUSED db.internal:5432 password=hunter2"));

    const response = await GET();
    const text = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(text)).toEqual({ ok: false, db: "error" });
    expect(text).not.toContain("hunter2");
    expect(text).not.toContain("db.internal");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(consoleError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});
