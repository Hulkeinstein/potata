import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, findUniqueMock, upsertMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findUniqueMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { userSettings: { findUnique: findUniqueMock, upsert: upsertMock } } }));

import { GET, PATCH } from "./route";

describe("/api/users/me/settings", () => {
  beforeEach(() => {
    authMock.mockReset();
    findUniqueMock.mockReset();
    upsertMock.mockReset();
  });

  it("기본 설정을 반환한다 when 저장된 행이 없다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    findUniqueMock.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: { preferredSize: null, aiCoordinatorEnabled: true } });
  });

  it("알 수 없는 필드를 거부한다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    const response = await PATCH(new Request("http://localhost/api/users/me/settings", { method: "PATCH", body: JSON.stringify({ preferredSize: "M", aiCoordinatorEnabled: false, userId: "attacker" }) }));
    expect(response.status).toBe(400);
  });

  it("세션 사용자에게만 설정을 upsert한다 when 입력이 유효하다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    upsertMock.mockResolvedValue({ preferredSize: "M", aiCoordinatorEnabled: false });
    const response = await PATCH(new Request("http://localhost/api/users/me/settings", { method: "PATCH", body: JSON.stringify({ preferredSize: "M", aiCoordinatorEnabled: false }) }));
    expect(response.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1" } }));
  });

  it("미인증 요청을 거부한다", async () => {
    authMock.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await PATCH(new Request("http://localhost", { method: "PATCH", body: "{}" }))).status).toBe(401);
  });

  it("잘못된 JSON을 400으로 거부한다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: "{" }));
    expect(response.status).toBe(400);
  });
});
