import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), read: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/benefits/read-service", () => ({ getOwnedBenefits: mocks.read }));
import { GET } from "./route";

describe("owned benefits route", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ user: { id: "owner-a" } }); mocks.read.mockResolvedValue({ coupons: [], points: { balance: 0, entries: [], nextCursor: null } }); });

  it("401을 반환한다 when 로그인하지 않았다", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await GET(new Request("http://localhost/api/users/me/benefits"))).status).toBe(401);
  });

  it("세션 사용자만 조회한다 when 공격자 userId query가 있다", async () => {
    await GET(new Request("http://localhost/api/users/me/benefits?userId=owner-b&cursor=cursor-1"));
    expect(mocks.read).toHaveBeenCalledWith("owner-a", "cursor-1");
  });
});
