import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: mock fn을 vi.mock 호이스팅 전에 초기화
const {
  authMock,
  userFindUniqueMock,
  followFindUniqueMock,
  followDeleteMock,
  followCreateManyMock,
  followCountMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  followFindUniqueMock: vi.fn(),
  followDeleteMock: vi.fn(),
  followCreateManyMock: vi.fn(),
  followCountMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUniqueMock },
    follow: {
      findUnique: followFindUniqueMock,
      delete: followDeleteMock,
      createMany: followCreateManyMock,
      count: followCountMock,
    },
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
    followFindUniqueMock.mockResolvedValue(null); // 기존 없음
    followCreateManyMock.mockResolvedValue({ count: 1 });
    followCountMock.mockResolvedValue(5);

    const res = await POST(makeReq(), makeParams("target2"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { following: boolean; followerCount: number } };
    expect(json.data.following).toBe(true);
    expect(json.data.followerCount).toBe(5);
    expect(followCreateManyMock).toHaveBeenCalledTimes(1);
    expect(followDeleteMock).not.toHaveBeenCalled();
  });

  // ── 멱등 토글 — 언팔로우(기존 존재) ─────────────────────────────────────

  it("기존 Follow 존재 → delete 호출 + following:false 반환", async () => {
    authMock.mockResolvedValue({ user: { id: "user1" } });
    userFindUniqueMock.mockResolvedValue({ id: "target2" });
    followFindUniqueMock.mockResolvedValue({ id: "follow1", followerId: "user1", followingId: "target2" });
    followDeleteMock.mockResolvedValue({ id: "follow1" });
    followCountMock.mockResolvedValue(4);

    const res = await POST(makeReq(), makeParams("target2"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { following: boolean; followerCount: number } };
    expect(json.data.following).toBe(false);
    expect(json.data.followerCount).toBe(4);
    expect(followDeleteMock).toHaveBeenCalledTimes(1);
    expect(followCreateManyMock).not.toHaveBeenCalled();
  });

  // ── IDOR 방어: body의 followerId가 무시되고 session.user.id 사용 ──────────

  it("IDOR: body에 다른 followerId 넣어도 createMany의 followerId는 session.user.id", async () => {
    // session user = "honest_user"
    authMock.mockResolvedValue({ user: { id: "honest_user" } });
    userFindUniqueMock.mockResolvedValue({ id: "target3" });
    followFindUniqueMock.mockResolvedValue(null);
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

  // ── followerCount는 count 쿼리로 집계 ───────────────────────────────────

  it("팔로우 후 followerCount는 prisma.follow.count 결과를 사용", async () => {
    authMock.mockResolvedValue({ user: { id: "user1" } });
    userFindUniqueMock.mockResolvedValue({ id: "target2" });
    followFindUniqueMock.mockResolvedValue(null);
    followCreateManyMock.mockResolvedValue({ count: 1 });
    followCountMock.mockResolvedValue(42); // count 쿼리 결과

    const res = await POST(makeReq(), makeParams("target2"));
    const json = (await res.json()) as { data: { followerCount: number } };
    expect(json.data.followerCount).toBe(42);
    expect(followCountMock).toHaveBeenCalledWith({ where: { followingId: "target2" } });
  });
});
