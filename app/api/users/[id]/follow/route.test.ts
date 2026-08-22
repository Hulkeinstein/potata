import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: mock fn을 vi.mock 호이스팅 전에 초기화
const {
  authMock,
  userFindUniqueMock,
  followFindUniqueMock,
  followDeleteManyMock,
  followCreateManyMock,
  followCountMock,
  notificationCreateMock,
  transactionMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  followFindUniqueMock: vi.fn(),
  followDeleteManyMock: vi.fn(),
  followCreateManyMock: vi.fn(),
  followCountMock: vi.fn(),
  notificationCreateMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUniqueMock },
    follow: {
      findUnique: followFindUniqueMock,
      deleteMany: followDeleteManyMock,
      createMany: followCreateManyMock,
      count: followCountMock,
    },
    notification: { create: notificationCreateMock },
    $transaction: transactionMock,
  },
}));

import { POST } from "./route";
import type { NextRequest } from "next/server";

/** params Promise 생성 헬퍼 */
function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

/** 빈 NextRequest — 팔로우 API는 body 사용 안 함 */
function makeReq(body?: Record<string, unknown>): NextRequest {
  return {
    url: "http://localhost/api/users/target1/follow",
    json: async () => body ?? {},
  } as unknown as NextRequest;
}

describe("POST /api/users/[id]/follow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const tx = {
      follow: { findUnique: followFindUniqueMock, deleteMany: followDeleteManyMock, createMany: followCreateManyMock, count: followCountMock },
      notification: { create: notificationCreateMock },
    };
    transactionMock.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
  });

  // ── 인증 ────────────────────────────────────────────────────────────────

  it("비로그인(auth null) → 401, DB 미호출", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(makeReq(), makeParams("target1"));
    expect(res.status).toBe(401);
    expect(userFindUniqueMock).not.toHaveBeenCalled();
    expect(followCreateManyMock).not.toHaveBeenCalled();
  });

  // ── self-follow ──────────────────────────────────────────────────────────

  it("self-follow: session.user.id === targetId → 400, prisma create 미호출", async () => {
    authMock.mockResolvedValue({ user: { id: "user1" } });
    const res = await POST(makeReq(), makeParams("user1")); // targetId = 자신
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/자기 자신/);
    // 절대 create되면 안 됨
    expect(followCreateManyMock).not.toHaveBeenCalled();
  });

  // ── 대상 없음 404 ────────────────────────────────────────────────────────

  it("대상 유저 없음(user.findUnique null) → 404", async () => {
    authMock.mockResolvedValue({ user: { id: "user1" } });
    userFindUniqueMock.mockResolvedValue(null); // 대상 없음
    const res = await POST(makeReq(), makeParams("ghost"));
    expect(res.status).toBe(404);
    expect(followCreateManyMock).not.toHaveBeenCalled();
  });

  // ── 멱등 토글 — 팔로우(신규) ─────────────────────────────────────────────

  it("기존 Follow 없음 → createMany 호출 + following:true 반환", async () => {
    authMock.mockResolvedValue({ user: { id: "user1" } });
    userFindUniqueMock.mockResolvedValue({ id: "target2" });
    followFindUniqueMock.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "follow1" }).mockResolvedValueOnce({ id: "follow1" });
    followCreateManyMock.mockResolvedValue({ count: 1 });
    followCountMock.mockResolvedValue(5);

    const res = await POST(makeReq(), makeParams("target2"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { following: boolean; followerCount: number } };
    expect(json.data.following).toBe(true);
    expect(json.data.followerCount).toBe(5);
    expect(followCreateManyMock).toHaveBeenCalledTimes(1);
    expect(notificationCreateMock).toHaveBeenCalledWith({ data: { recipientId: "target2", actorId: "user1", type: "FOLLOW", sourceFollowId: "follow1" } });
    expect(followDeleteManyMock).not.toHaveBeenCalled();
  });

  // ── 멱등 토글 — 언팔로우(기존 존재) ─────────────────────────────────────

  it("기존 Follow 존재 → delete 호출 + following:false 반환", async () => {
    authMock.mockResolvedValue({ user: { id: "user1" } });
    userFindUniqueMock.mockResolvedValue({ id: "target2" });
    followFindUniqueMock.mockResolvedValueOnce({ id: "follow1" }).mockResolvedValueOnce(null);
    followDeleteManyMock.mockResolvedValue({ count: 1 });
    followCountMock.mockResolvedValue(4);

    const res = await POST(makeReq(), makeParams("target2"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { following: boolean; followerCount: number } };
    expect(json.data.following).toBe(false);
    expect(json.data.followerCount).toBe(4);
    expect(followDeleteManyMock).toHaveBeenCalledWith({ where: { followerId: "user1", followingId: "target2" } });
    expect(followCreateManyMock).not.toHaveBeenCalled();
    expect(notificationCreateMock).not.toHaveBeenCalled();
  });

  // ── IDOR 방어: body의 followerId가 무시되고 session.user.id 사용 ──────────

  it("IDOR: body에 다른 followerId 넣어도 createMany의 followerId는 session.user.id", async () => {
    // session user = "honest_user"
    authMock.mockResolvedValue({ user: { id: "honest_user" } });
    userFindUniqueMock.mockResolvedValue({ id: "target3" });
    followFindUniqueMock.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "follow2" }).mockResolvedValueOnce({ id: "follow2" });
    followCreateManyMock.mockResolvedValue({ count: 1 });
    followCountMock.mockResolvedValue(1);

    // body에 악의적 followerId 주입 시도 — 라우트는 body를 읽지 않으므로 무시됨
    const maliciousBody = { followerId: "attacker_id" };
    const res = await POST(makeReq(maliciousBody), makeParams("target3"));
    expect(res.status).toBe(200);

    // createMany에 전달된 data의 followerId가 반드시 session.user.id("honest_user")여야 함
    const callArg = followCreateManyMock.mock.calls[0][0] as {
      data: Array<{ followerId: string; followingId: string }>;
    };
    expect(callArg.data[0].followerId).toBe("honest_user");
    // 공격자 ID가 절대 들어가지 않음
    expect(callArg.data[0].followerId).not.toBe("attacker_id");
  });

  it("동시 팔로우 경쟁에서 createMany count 0이면 알림을 중복 생성하지 않는다", async () => {
    authMock.mockResolvedValue({ user: { id: "user1" } });
    userFindUniqueMock.mockResolvedValue({ id: "target2" });
    followFindUniqueMock.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "winner" });
    followCreateManyMock.mockResolvedValue({ count: 0 });
    followCountMock.mockResolvedValue(1);

    const response = await POST(makeReq(), makeParams("target2"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { following: true, followerCount: 1 } });
    expect(notificationCreateMock).not.toHaveBeenCalled();
  });

  it("stale unfollow는 deleteMany count 0이어도 500 없이 실제 상태를 반환한다", async () => {
    authMock.mockResolvedValue({ user: { id: "user1" } });
    userFindUniqueMock.mockResolvedValue({ id: "target2" });
    followFindUniqueMock.mockResolvedValueOnce({ id: "stale" }).mockResolvedValueOnce(null);
    followDeleteManyMock.mockResolvedValue({ count: 0 });
    followCountMock.mockResolvedValue(0);

    const response = await POST(makeReq(), makeParams("target2"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { following: false, followerCount: 0 } });
  });

  it("transaction 내부 오류 메시지를 클라이언트에 노출하지 않는다", async () => {
    authMock.mockResolvedValue({ user: { id: "user1" } });
    userFindUniqueMock.mockResolvedValue({ id: "target2" });
    transactionMock.mockRejectedValue(new Error("Prisma constraint sourceFollowId_key failed"));

    const response = await POST(makeReq(), makeParams("target2"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      success: false,
      error: "팔로우 상태를 변경하지 못했습니다.",
    });
  });

  // ── followerCount는 count 쿼리로 집계 ───────────────────────────────────

  it("팔로우 후 followerCount는 prisma.follow.count 결과를 사용", async () => {
    authMock.mockResolvedValue({ user: { id: "user1" } });
    userFindUniqueMock.mockResolvedValue({ id: "target2" });
    followFindUniqueMock.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "follow3" }).mockResolvedValueOnce({ id: "follow3" });
    followCreateManyMock.mockResolvedValue({ count: 1 });
    followCountMock.mockResolvedValue(42); // count 쿼리 결과

    const res = await POST(makeReq(), makeParams("target2"));
    const json = (await res.json()) as { data: { followerCount: number } };
    expect(json.data.followerCount).toBe(42);
    expect(followCountMock).toHaveBeenCalledWith({ where: { followingId: "target2" } });
  });
});
