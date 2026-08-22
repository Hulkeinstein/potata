import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.hoisted(() => vi.fn((handler: (request: { auth: null; nextUrl: URL }) => Response) => handler));
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/admin", () => ({ isAdmin: vi.fn(() => false) }));

describe("middleware notifications protection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("미인증 알림 접근을 callbackUrl과 함께 로그인으로 보낸다", async () => {
    const middleware = (await import("./middleware")).default;
    const response = await middleware(new NextRequest("http://localhost:3000/notifications"), {
      params: Promise.resolve({}),
    });
    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) throw new TypeError("Expected redirect response");
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?callbackUrl=%2Fnotifications");
  });

  it("matcher에 알림 경로를 포함한다", async () => {
    const { config } = await import("./middleware");
    expect(config.matcher).toContain("/notifications/:path*");
  });
});
