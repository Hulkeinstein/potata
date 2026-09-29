import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, isAdminMock, startMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  isAdminMock: vi.fn(),
  startMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/admin", () => ({ isAdmin: isAdminMock }));
vi.mock("@/lib/benefits/admin-step-up", () => ({ startGoogleStepUp: startMock }));

import { POST } from "./route";
import { STEP_UP_COOKIE } from "@/lib/benefits/google-reauth";

beforeEach(() => {
  vi.clearAllMocks();
  isAdminMock.mockReturnValue(true);
  startMock.mockResolvedValue("proof-token");
  authMock.mockResolvedValue({ user: { id: "admin1", email: "admin@example.com" } });
});

describe("POST 관리자 Google 재인증 시작", () => {
  it("proof를 응답 본문이 아니라 httpOnly 쿠키로만 내보낸다", async () => {
    const response = await POST();
    const cookie = response.headers.get("set-cookie") ?? "";

    expect(cookie).toContain(`${STEP_UP_COOKIE}=proof-token`);
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie.toLowerCase()).toContain("samesite=lax"); // Google에서 돌아올 때도 실려야 한다
    expect(JSON.stringify(await response.json())).not.toContain("proof-token");
  });

  it("관리자가 아니면 403이며 proof를 만들지 않는다", async () => {
    isAdminMock.mockReturnValue(false);

    const response = await POST();

    expect(response.status).toBe(403);
    expect(startMock).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("세션에 사용자 id가 없으면 403", async () => {
    authMock.mockResolvedValue({ user: { email: "admin@example.com" } });

    const response = await POST();

    expect(response.status).toBe(403);
    expect(startMock).not.toHaveBeenCalled();
  });
});
