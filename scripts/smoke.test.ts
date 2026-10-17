// @vitest-environment node
import { describe, expect, it } from "vitest";

import { CHECKS, runSmoke } from "./smoke";

const SECURITY = {
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=()",
  "strict-transport-security": "max-age=63072000",
};

/** 경로별 정상 배포 응답 — 테스트마다 일부를 바꿔 FAIL 을 만든다 */
function healthySite(overrides: Record<string, () => Response> = {}) {
  const routes: Record<string, () => Response> = {
    "/": () => new Response("<html></html>", { status: 200, headers: SECURITY }),
    "/shop": () => new Response("ok", { status: 200 }),
    "/api/health": () => Response.json({ ok: true, db: "ok" }),
    "/api/auth/providers": () => Response.json({ google: {}, credentials: {} }),
    "/api/cart": () => Response.json({ error: "Unauthorized" }, { status: 401 }),
    "/admin": () => new Response(null, { status: 307, headers: { location: "https://x.test/login?callbackUrl=%2Fadmin" } }),
    "/mypage": () => new Response(null, { status: 307, headers: { location: "https://x.test/login" } }),
    ...overrides,
  };
  const requested: { url: string; init?: RequestInit }[] = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    requested.push({ url, init });
    const handler = routes[new URL(url).pathname];
    if (!handler) throw new Error(`unexpected ${url}`);
    return handler();
  };
  return { fetchImpl, requested };
}

describe("CHECKS", () => {
  it("계획(docs/work-plans/health-smoke.md)의 7항목을 그대로 점검한다 — 점검이 조용히 빠지지 않게", () => {
    expect(CHECKS.map((check) => check.path)).toEqual(["/", "/shop", "/api/health", "/api/auth/providers", "/api/cart", "/admin", "/mypage"]);
  });
});

describe("runSmoke", () => {
  it("정상 배포면 모든 점검이 통과하고, 읽기 전용 GET 을 redirect 따라가지 않고 보낸다", async () => {
    const { fetchImpl, requested } = healthySite();

    const results = await runSmoke("https://x.test", fetchImpl);

    expect(results).toHaveLength(CHECKS.length);
    expect(results.filter((r) => !r.ok)).toEqual([]);
    for (const { init } of requested) {
      expect(init?.method ?? "GET").toBe("GET");
      expect(init?.redirect).toBe("manual");
      expect(init?.body).toBeUndefined();
    }
  });

  it.each([
    ["보안 헤더가 빠지면", "/", () => new Response("<html></html>", { status: 200 }), "보안 헤더"],
    ["Shop 이 500 이면", "/shop", () => new Response("error", { status: 500 }), "status 500"],
    ["상태 확인이 503 이면", "/api/health", () => Response.json({ ok: false, db: "error" }, { status: 503 }), "503"],
    ["상태 확인이 ok:false 면", "/api/health", () => Response.json({ ok: false }), "ok !== true"],
    ["Google 공급자가 없으면", "/api/auth/providers", () => Response.json({ credentials: {} }), "google"],
    ["장바구니가 비로그인에 열려 있으면", "/api/cart", () => Response.json([], { status: 200 }), "status 200"],
    ["관리자가 redirect 없이 열리면", "/admin", () => new Response("admin", { status: 200 }), "3xx"],
    ["마이페이지가 로그인 아닌 곳으로 보내면", "/mypage", () => new Response(null, { status: 307, headers: { location: "/" } }), "/login"],
    ["마이페이지가 /login 과 비슷한 다른 경로로 보내면", "/mypage", () => new Response(null, { status: 307, headers: { location: "https://x.test/login-x" } }), "/login"],
  ])("%s 해당 점검만 FAIL 이다", async (_label, path, response, reason) => {
    const { fetchImpl } = healthySite({ [path]: response });

    const results = await runSmoke("https://x.test", fetchImpl);
    const failed = results.filter((r) => !r.ok);

    expect(failed).toHaveLength(1);
    expect(failed[0]!.path).toBe(path);
    expect(failed[0]!.detail).toContain(reason);
  });

  it("연결 자체가 실패하면 예외로 멈추지 않고 그 점검을 FAIL 로 기록한다", async () => {
    const results = await runSmoke("https://x.test", async () => {
      throw new Error("ECONNREFUSED");
    });

    expect(results.every((r) => !r.ok)).toBe(true);
    expect(results[0]!.detail).toContain("ECONNREFUSED");
  });
});
