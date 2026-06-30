import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: mock fn을 vi.mock 호이스팅 전에 초기화
const {
  userFindUniqueMock,
  followFindUniqueMock,
  followCountMock,
  oOTDPostCountMock,
  oOTDPostFindManyMock,
} = vi.hoisted(() => ({
  userFindUniqueMock: vi.fn(),
  followFindUniqueMock: vi.fn(),
  followCountMock: vi.fn(),
  oOTDPostCountMock: vi.fn(),
  oOTDPostFindManyMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUniqueMock },
    follow: {
      findUnique: followFindUniqueMock,
      count: followCountMock,
    },
    oOTDPost: {
      count: oOTDPostCountMock,
      findMany: oOTDPostFindManyMock,
    },
  },
}));

import { getPublicProfile } from "./profile";

/** 정상 유저 stub */
const stubUser = { id: "user1", name: "Kim", avatar: null, handle: "style_kim" };
/** 정상 posts stub */
const stubPosts = [{ id: "p1", imageUrls: ["https://cdn/img.jpg"] }];

describe("getPublicProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 존재하지 않는 handle ──────────────────────────────────────────────────

  it("존재하지 않는 handle(findUnique null) → null 반환", async () => {
    userFindUniqueMock.mockResolvedValue(null);

    const result = await getPublicProfile("ghost_handle", null);

    expect(result).toBeNull();
    // 유저가 없으면 count/follow 쿼리 불필요
    expect(followCountMock).not.toHaveBeenCalled();
    expect(oOTDPostCountMock).not.toHaveBeenCalled();
    expect(followFindUniqueMock).not.toHaveBeenCalled();
  });

  // ── 화이트리스트 select 단언 ────────────────────────────────────────────

  it("화이트리스트 select: findUnique 호출 시 email/passwordHash/orders 없음, {id,name,avatar,handle}만", async () => {
    userFindUniqueMock.mockResolvedValue(stubUser);
    followCountMock.mockResolvedValue(0);
    oOTDPostCountMock.mockResolvedValue(0);
    oOTDPostFindManyMock.mockResolvedValue([]);
    // viewerId null → followFindUnique 미호출

    await getPublicProfile("style_kim", null);

    // findUnique 호출됨
    expect(userFindUniqueMock).toHaveBeenCalledTimes(1);
    const callArg = userFindUniqueMock.mock.calls[0][0] as {
      where: { handle: string };
      select: Record<string, boolean>;
    };

    // where 검증
    expect(callArg.where.handle).toBe("style_kim");

    // select 화이트리스트 검증
    const select = callArg.select;
    expect(select.id).toBe(true);
    expect(select.name).toBe(true);
    expect(select.avatar).toBe(true);
    expect(select.handle).toBe(true);

    // 민감 필드 절대 미포함
    expect(select.email).toBeUndefined();
    expect(select.passwordHash).toBeUndefined();
    expect(select.orders).toBeUndefined();
  });

  // ── count 쿼리 단언 ──────────────────────────────────────────────────────

  it("follower/following/post count 쿼리가 각각 정확히 호출됨", async () => {
    userFindUniqueMock.mockResolvedValue(stubUser);
    followCountMock
      .mockResolvedValueOnce(10) // followerCount (followingId = user.id)
      .mockResolvedValueOnce(5); // followingCount (followerId = user.id)
    oOTDPostCountMock.mockResolvedValue(3);
    oOTDPostFindManyMock.mockResolvedValue(stubPosts);

    const result = await getPublicProfile("style_kim", null);

    expect(result).not.toBeNull();
    expect(result!.followerCount).toBe(10);
    expect(result!.followingCount).toBe(5);
    expect(result!.postCount).toBe(3);

    // followerCount: followingId = user.id
    expect(followCountMock).toHaveBeenCalledWith({ where: { followingId: "user1" } });
    // followingCount: followerId = user.id
    expect(followCountMock).toHaveBeenCalledWith({ where: { followerId: "user1" } });
    // postCount
    expect(oOTDPostCountMock).toHaveBeenCalledWith({ where: { userId: "user1" } });
  });

  // ── isFollowing: viewerId null → false, follow.findUnique 미호출 ──────────

  it("viewerId null → isFollowing: false, follow.findUnique 미호출", async () => {
    userFindUniqueMock.mockResolvedValue(stubUser);
    followCountMock.mockResolvedValue(0);
    oOTDPostCountMock.mockResolvedValue(0);
    oOTDPostFindManyMock.mockResolvedValue([]);

    const result = await getPublicProfile("style_kim", null);

    expect(result).not.toBeNull();
    expect(result!.isFollowing).toBe(false);
    // 비로그인이므로 follow.findUnique 절대 미호출
    expect(followFindUniqueMock).not.toHaveBeenCalled();
  });

  // ── isFollowing: viewerId 있고 follow 존재 → true ────────────────────────

  it("viewerId 있고 follow row 존재 → isFollowing: true", async () => {
    userFindUniqueMock.mockResolvedValue(stubUser);
    followCountMock.mockResolvedValue(0);
    oOTDPostCountMock.mockResolvedValue(0);
    followFindUniqueMock.mockResolvedValue({
      followerId: "viewer1",
      followingId: "user1",
    });
    oOTDPostFindManyMock.mockResolvedValue([]);

    const result = await getPublicProfile("style_kim", "viewer1");

    expect(result).not.toBeNull();
    expect(result!.isFollowing).toBe(true);

    // follow.findUnique 호출 인자 검증
    expect(followFindUniqueMock).toHaveBeenCalledWith({
      where: {
        followerId_followingId: {
          followerId: "viewer1",
          followingId: "user1",
        },
      },
    });
  });

  // ── isFollowing: viewerId 있지만 follow 미존재 → false ───────────────────

  it("viewerId 있지만 follow row 없음 → isFollowing: false", async () => {
    userFindUniqueMock.mockResolvedValue(stubUser);
    followCountMock.mockResolvedValue(0);
    oOTDPostCountMock.mockResolvedValue(0);
    followFindUniqueMock.mockResolvedValue(null); // 팔로우 안 함
    oOTDPostFindManyMock.mockResolvedValue([]);

    const result = await getPublicProfile("style_kim", "stranger1");

    expect(result).not.toBeNull();
    expect(result!.isFollowing).toBe(false);
  });

  // ── 반환값 구조 단언 (민감 필드 미포함) ─────────────────────────────────

  it("반환 PublicProfile에 email/passwordHash/orders 필드 없음", async () => {
    userFindUniqueMock.mockResolvedValue(stubUser);
    followCountMock.mockResolvedValue(2);
    oOTDPostCountMock.mockResolvedValue(1);
    followFindUniqueMock.mockResolvedValue(null);
    oOTDPostFindManyMock.mockResolvedValue(stubPosts);

    const result = await getPublicProfile("style_kim", "viewer1");

    expect(result).not.toBeNull();
    // 공개 필드 존재
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("handle");
    expect(result).toHaveProperty("avatar");
    expect(result).toHaveProperty("followerCount");
    expect(result).toHaveProperty("followingCount");
    expect(result).toHaveProperty("postCount");
    expect(result).toHaveProperty("isFollowing");
    expect(result).toHaveProperty("posts");

    // 민감 필드 절대 미포함
    expect(result).not.toHaveProperty("email");
    expect(result).not.toHaveProperty("passwordHash");
    expect(result).not.toHaveProperty("orders");
  });
});
