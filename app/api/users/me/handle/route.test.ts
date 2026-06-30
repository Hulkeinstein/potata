import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: mock fn을 vi.mock 호이스팅 전에 초기화
const {
  authMock,
  userFindUniqueMock,
  userUpdateMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  userUpdateMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: userFindUniqueMock,
      update: userUpdateMock,
    },
  },
}));

import { PATCH } from "./route";
import type { NextRequest } from "next/server";

/** JSON body를 가진 NextRequest 모의 */
function makeReq(body: Record<string, unknown>): NextRequest {
  return {
    url: "http://localhost/api/users/me/handle",
    json: async () => body,
  } as unknown as NextRequest;
}

describe("PATCH /api/users/me/handle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 인증 ────────────────────────────────────────────────────────────────

  it("비로그인(auth null) → 401, DB 미호출", async () => {
    authMock.mockResolvedValue(null);
    const res = await PATCH(makeReq({ handle: "valid_handle" }));
    expect(res.status).toBe(401);
    expect(userFindUniqueMock).not.toHaveBeenCalled();
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  // ── 서버 검증 — 짧은 handle ──────────────────────────────────────────────

  it("validateHandle 거부(2자 handle) → 400, DB 미호출", async () => {
    authMock.mockResolvedValue({ user: { id: "user1" } });
    const res = await PATCH(makeReq({ handle: "ab" }));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/핸들/);
    expect(userFindUniqueMock).not.toHaveBeenCalled();
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  // ── 서버 검증 — 예약어 ───────────────────────────────────────────────────

  it("validateHandle 거부(예약어 admin) → 400", async () => {
    authMock.mockResolvedValue({ user: { id: "user1" } });
    const res = await PATCH(makeReq({ handle: "admin" }));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { success: boolean; error: string };
    expect(json.success).toBe(false);
    // DB 쿼리 전에 차단되어야 함
    expect(userFindUniqueMock).not.toHaveBeenCalled();
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  // ── 이미 handle set — null→set 1회 제한 ────────────────────────────────

  it("이미 handle 보유(non-null) → 409 변경 불가, update 미호출", async () => {
    authMock.mockResolvedValue({ user: { id: "user1" } });
    // 1st findUnique: 본인 handle 조회 → 이미 set
    userFindUniqueMock.mockResolvedValueOnce({ handle: "existing_handle" });

    const res = await PATCH(makeReq({ handle: "new_handle" }));
    expect(res.status).toBe(409);
    const json = (await res.json()) as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/변경할 수 없/);
    expect(userUpdateMock).not.toHaveBeenCalled();
    // 본인 handle 조회(1회)만 실행, target unique 체크 미실행
    expect(userFindUniqueMock).toHaveBeenCalledTimes(1);
  });

  // ── 중복 handle — 선행 findUnique 충돌 ───────────────────────────────────

  it("handle 중복(findUnique hit, 다른 유저) → 409", async () => {
    authMock.mockResolvedValue({ user: { id: "user1" } });
    // 1st findUnique: 본인 handle 조회 → null(미설정)
    userFindUniqueMock.mockResolvedValueOnce({ handle: null });
    // 2nd findUnique: target handle 체크 → 다른 유저가 보유
    userFindUniqueMock.mockResolvedValueOnce({ id: "other_user" });

    const res = await PATCH(makeReq({ handle: "taken_handle" }));
    expect(res.status).toBe(409);
    const json = (await res.json()) as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/이미 사용 중인/);
    // 중복 확인 후 update는 호출되지 않아야 함
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  // ── P2002 경쟁 조건 최종 방어 ────────────────────────────────────────────

  it("update 중 P2002(경쟁 조건) → 409", async () => {
    authMock.mockResolvedValue({ user: { id: "user1" } });
    // 1st findUnique: 본인 handle 조회 → null(미설정)
    userFindUniqueMock.mockResolvedValueOnce({ handle: null });
    // 2nd findUnique: target handle 체크 → 충돌 없음
    userFindUniqueMock.mockResolvedValueOnce(null);
    const p2002Error = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
    });
    userUpdateMock.mockRejectedValue(p2002Error);

    const res = await PATCH(makeReq({ handle: "race_handle" }));
    expect(res.status).toBe(409);
    const json = (await res.json()) as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/이미 사용 중인/);
  });

  // ── 정상 처리 200 ────────────────────────────────────────────────────────

  it("정상: auth ok, validateHandle ok, findUnique miss → update 호출 + 200", async () => {
    authMock.mockResolvedValue({ user: { id: "user1" } });
    // 1st findUnique: 본인 handle 조회 → null(미설정)
    userFindUniqueMock.mockResolvedValueOnce({ handle: null });
    // 2nd findUnique: target handle 체크 → 중복 없음
    userFindUniqueMock.mockResolvedValueOnce(null);
    userUpdateMock.mockResolvedValue({ id: "user1", handle: "cool_handle" });

    const res = await PATCH(makeReq({ handle: "cool_handle" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; data: { handle: string } };
    expect(json.success).toBe(true);
    expect(json.data.handle).toBe("cool_handle");

    // update 호출 인자 검증 — where.id는 session.user.id
    expect(userUpdateMock).toHaveBeenCalledTimes(1);
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: "user1" },
      data: { handle: "cool_handle" },
    });
  });

  // ── IDOR: body의 userId 주입 시도 — session.user.id 고정 ─────────────────

  it("IDOR: body에 userId 주입해도 update where는 session.user.id(attacker 무시)", async () => {
    // session user = "honest_user"
    authMock.mockResolvedValue({ user: { id: "honest_user" } });
    // 1st findUnique: 본인 handle 조회 → null(미설정)
    userFindUniqueMock.mockResolvedValueOnce({ handle: null });
    // 2nd findUnique: target handle 체크 → 중복 없음
    userFindUniqueMock.mockResolvedValueOnce(null);
    userUpdateMock.mockResolvedValue({ id: "honest_user", handle: "legit_handle" });

    // body에 악의적 userId 주입 시도
    const maliciousBody = { handle: "legit_handle", userId: "attacker_id" };
    const res = await PATCH(makeReq(maliciousBody));
    expect(res.status).toBe(200);

    // update의 where.id는 반드시 session.user.id("honest_user")여야 함
    const callArg = userUpdateMock.mock.calls[0][0] as {
      where: { id: string };
      data: { handle: string };
    };
    expect(callArg.where.id).toBe("honest_user");
    // 공격자 ID가 절대 들어가지 않음
    expect(callArg.where.id).not.toBe("attacker_id");
  });

});

