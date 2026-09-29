import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, isAdminMock, verifyMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  isAdminMock: vi.fn(),
  verifyMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/admin", () => ({ isAdmin: isAdminMock }));
vi.mock("@/lib/benefits/admin-step-up", () => ({ verifyGoogleStepUp: verifyMock }));

import { GET } from "./route";
import { STEP_UP_COOKIE } from "@/lib/benefits/google-reauth";

const NOW = 1_700_000_000_000;

function request(cookie?: string): Request {
  return new Request("http://localhost/api/admin/benefits/reauth/google/complete", {
    headers: cookie ? { cookie } : {},
  });
}

function destination(response: Response): string {
  return new URL(response.headers.get("location") ?? "").search;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.setSystemTime(NOW);
  isAdminMock.mockReturnValue(true);
  verifyMock.mockResolvedValue(true);
  authMock.mockResolvedValue({
    user: { id: "admin1", email: "admin@example.com" },
    googleAuthTime: NOW / 1000,
  });
});

describe("GET 관리자 Google 재인증 복귀", () => {
  it("방금 Google 인증을 마친 관리자만 proof가 유효해진다", async () => {
    const response = await GET(request(`${STEP_UP_COOKIE}=token-1`));

    expect(verifyMock).toHaveBeenCalledWith("admin1", "token-1");
    expect(destination(response)).toBe("?stepUp=done");
  });

  it("세션만 있고 Google 인증이 없으면 거부한다 — 세션 탈취자가 통과하면 안 된다", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", email: "admin@example.com" } });

    const response = await GET(request(`${STEP_UP_COOKIE}=token-1`));

    expect(verifyMock).not.toHaveBeenCalled();
    expect(destination(response)).toBe("?stepUp=failed");
  });

  it("오래된 Google 인증은 거부한다 — 예전 로그인을 재사용할 수 없다", async () => {
    authMock.mockResolvedValue({
      user: { id: "admin1", email: "admin@example.com" },
      googleAuthTime: (NOW - 10 * 60 * 1000) / 1000,
    });

    const response = await GET(request(`${STEP_UP_COOKIE}=token-1`));

    expect(verifyMock).not.toHaveBeenCalled();
    expect(destination(response)).toBe("?stepUp=failed");
  });

  it("proof 쿠키가 없으면 거부한다 — 주소창의 값으로는 통과할 수 없다", async () => {
    const response = await GET(request());

    expect(verifyMock).not.toHaveBeenCalled();
    expect(destination(response)).toBe("?stepUp=failed");
  });

  it("관리자가 아니면 거부한다", async () => {
    isAdminMock.mockReturnValue(false);

    const response = await GET(request(`${STEP_UP_COOKIE}=token-1`));

    expect(verifyMock).not.toHaveBeenCalled();
    expect(destination(response)).toBe("?stepUp=failed");
  });

  it("서버가 proof를 모르면(만료·위조) 거부한다", async () => {
    verifyMock.mockResolvedValue(false);

    const response = await GET(request(`${STEP_UP_COOKIE}=unknown`));

    expect(destination(response)).toBe("?stepUp=failed");
  });

  it("성공해도 주소창에 proof 값을 싣지 않는다", async () => {
    const response = await GET(request(`${STEP_UP_COOKIE}=token-1`));

    expect(response.headers.get("location")).not.toContain("token-1");
  });
});
