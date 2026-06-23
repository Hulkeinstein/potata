import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, postFindUnique, likeFindUnique, likeDelete, likeCreateMany, likeCount } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    postFindUnique: vi.fn(),
    likeFindUnique: vi.fn(),
    likeDelete: vi.fn(),
    likeCreateMany: vi.fn(),
    likeCount: vi.fn(),
  }));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    oOTDPost: { findUnique: postFindUnique },
    oOTDLike: {
      findUnique: likeFindUnique,
      delete: likeDelete,
      createMany: likeCreateMany,
      count: likeCount,
    },
  },
}));

import { POST } from "./route";
import type { NextRequest } from "next/server";

const req = () =>
  new Request("http://localhost/api/ootd/p1/like", { method: "POST" }) as unknown as NextRequest;
const ctx = (id = "p1") => ({ params: Promise.resolve({ id }) });

describe("POST /api/ootd/[id]/like", () => {
  beforeEach(() => vi.clearAllMocks());

  it("미인증은 401", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(req(), ctx());
    expect(res.status).toBe(401);
    expect(postFindUnique).not.toHaveBeenCalled();
  });

  it("없는 게시물은 404", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    postFindUnique.mockResolvedValue(null);
    const res = await POST(req(), ctx("nope"));
    expect(res.status).toBe(404);
  });

  it("첫 좋아요: createMany + liked:true", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    postFindUnique.mockResolvedValue({ id: "p1" });
    likeFindUnique.mockResolvedValue(null);
    likeCount.mockResolvedValue(1);

    const res = await POST(req(), ctx());
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { liked: boolean; likeCount: number } };
    expect(json.data.liked).toBe(true);
    expect(json.data.likeCount).toBe(1);
    expect(likeCreateMany).toHaveBeenCalledWith({
      data: [{ userId: "u1", postId: "p1" }],
      skipDuplicates: true,
    });
    expect(likeDelete).not.toHaveBeenCalled();
  });

  it("재호출(취소): delete + liked:false", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    postFindUnique.mockResolvedValue({ id: "p1" });
    likeFindUnique.mockResolvedValue({ id: "like1" });
    likeCount.mockResolvedValue(0);

    const res = await POST(req(), ctx());
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { liked: boolean } };
    expect(json.data.liked).toBe(false);
    expect(likeDelete).toHaveBeenCalledWith({ where: { id: "like1" } });
    expect(likeCreateMany).not.toHaveBeenCalled();
  });
});
