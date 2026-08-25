import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), isAdmin: vi.fn(), reauth: vi.fn(), list: vi.fn(), createCampaign: vi.fn(), updateCampaign: vi.fn(), deactivateCampaign: vi.fn(), preview: vi.fn(), issue: vi.fn(), revoke: vi.fn(), policy: vi.fn(), grant: vi.fn(), reverse: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("@/lib/benefits/admin-reauth", () => ({ AdminReauthRateLimitError: class AdminReauthRateLimitError extends Error {}, verifyAdminReauth: mocks.reauth }));
vi.mock("@/lib/benefits/admin-service", () => ({
  BenefitInputError: class BenefitInputError extends Error {},
  listAdminBenefits: mocks.list,
  createCampaign: mocks.createCampaign,
  updateCampaign: mocks.updateCampaign,
  deactivateCampaign: mocks.deactivateCampaign,
  previewAudience: mocks.preview,
  issueCoupon: mocks.issue,
  revokeCoupon: mocks.revoke,
  createPointPolicy: mocks.policy,
  grantPoints: mocks.grant,
  reversePoints: mocks.reverse,
}));

import { GET, POST } from "./route";

const post = (body: unknown) => POST(new Request("http://localhost/api/admin/benefits", { method: "POST", body: JSON.stringify(body) }));

describe("admin benefits route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });
    mocks.isAdmin.mockReturnValue(true);
    mocks.reauth.mockResolvedValue(true);
  });

  it("401을 반환한다 when 세션이 없다", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });

  it("403을 반환한다 when 관리자가 아니다", async () => {
    mocks.isAdmin.mockReturnValue(false);
    expect((await GET()).status).toBe(403);
  });

  it("서버 대상 수를 반환한다 when 전체 발급을 미리 본다", async () => {
    mocks.preview.mockResolvedValue({ count: 7, token: "preview-token" });
    const response = await post({ action: "PREVIEW", campaignId: "campaign-1", audience: "ALL_VERIFIED_USERS" });
    expect((await response.json()).data.count).toBe(7);
    expect(mocks.preview).toHaveBeenCalledWith("campaign-1", "ALL_VERIFIED_USERS", undefined);
  });

  it("클라이언트 사용자 목록을 거부한다 when 발급 payload가 잘못됐다", async () => {
    const response = await post({ action: "ISSUE", campaignId: "c1", audience: "ALL_VERIFIED_USERS", users: ["victim"], reason: "pilot" });
    expect(response.status).toBe(400);
    expect(mocks.issue).not.toHaveBeenCalled();
  });

  it("400을 반환한다 when JSON이 손상됐다", async () => {
    const response = await POST(new Request("http://localhost/api/admin/benefits", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
  });

  it("확인 수와 멱등 키를 서버 서비스에 전달한다 when 전체 발급한다", async () => {
    mocks.issue.mockResolvedValue({ id: "batch-1" });
    const response = await post({ action: "ISSUE", campaignId: "c1", audience: "ALL_VERIFIED_USERS", confirmedCount: 7, confirmedToken: "preview-token", reason: "pilot", idempotencyKey: "issue-1", reauthPassword: "qa-password" });
    expect(response.status).toBe(200);
    expect(mocks.issue).toHaveBeenCalledWith("admin-1", expect.objectContaining({ confirmedCount: 7, idempotencyKey: "issue-1" }));
  });

  it("403을 반환한다 when 관리자 비밀번호 재인증이 실패한다", async () => {
    mocks.reauth.mockResolvedValue(false);
    const response = await post({ action: "DEACTIVATE_CAMPAIGN", campaignId: "c1", reason: "close", idempotencyKey: "close-1", reauthPassword: "wrong" });
    expect(response.status).toBe(403);
    expect(mocks.deactivateCampaign).not.toHaveBeenCalled();
  });
});
