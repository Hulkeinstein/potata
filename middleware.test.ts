import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.hoisted(() => vi.fn((handler: (request: { auth: null; nextUrl: URL }) => Response) => handler));
const adminMock = vi.hoisted(() => vi.fn(() => false));
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/admin", () => ({ isAdmin: adminMock }));

describe("middleware notifications protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminMock.mockReturnValue(false);
  });

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

  it("인증 보호를 Node.js에서 실행해 Edge 함수 용량 제한을 피한다", async () => {
    const { config } = await import("./middleware");
    expect(config).toHaveProperty("runtime", "nodejs");
  });

  it("미인증 관리자 접근을 로그인으로 보낸다", async () => {
    const middleware = (await import("./middleware")).default;
    const response = await middleware(new NextRequest("http://localhost:3000/admin"), {
      params: Promise.resolve({}),
    });
    if (!(response instanceof Response)) throw new TypeError("Expected redirect response");
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?callbackUrl=%2Fadmin");
  });

  it("로그인한 비관리자의 관리자 접근을 홈으로 차단한다", async () => {
    const request = new NextRequest("http://localhost:3000/admin");
    Object.defineProperty(request, "auth", { value: { user: { email: "member@example.test" } } });
    const middleware = (await import("./middleware")).default;
    const response = await middleware(request, { params: Promise.resolve({}) });
    if (!(response instanceof Response)) throw new TypeError("Expected redirect response");
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("로그인한 관리자의 관리자 접근을 허용한다", async () => {
    const request = new NextRequest("http://localhost:3000/admin");
    Object.defineProperty(request, "auth", { value: { user: { email: "admin@example.test" } } });
    adminMock.mockReturnValue(true);
    const middleware = (await import("./middleware")).default;
    const response = await middleware(request, { params: Promise.resolve({}) });
    if (!(response instanceof Response)) throw new TypeError("Expected middleware response");
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
