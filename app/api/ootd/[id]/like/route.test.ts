import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), postFindUnique: vi.fn(), likeFindUnique: vi.fn(), likeCreate: vi.fn(),
  likeDelete: vi.fn(), likeCount: vi.fn(), notificationCreate: vi.fn(), transaction: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  oOTDPost: { findUnique: mocks.postFindUnique },
  oOTDLike: { findUnique: mocks.likeFindUnique, count: mocks.likeCount },
  $transaction: mocks.transaction,
} }));

import type { NextRequest } from "next/server";
import { POST } from "./route";

const request = new Request("http://localhost/api/ootd/p1/like", { method: "POST" }) as NextRequest;
const context = { params: Promise.resolve({ id: "p1" }) };
const tx = {
  oOTDPost: { findUnique: mocks.postFindUnique },
  oOTDLike: { findUnique: mocks.likeFindUnique, create: mocks.likeCreate, delete: mocks.likeDelete, count: mocks.likeCount },
  notification: { create: mocks.notificationCreate },
};

describe("POST /api/ootd/[id]/like", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await POST(request, context)).status).toBe(401);
    expect(mocks.postFindUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when the post is absent", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u1" } });
    mocks.postFindUnique.mockResolvedValue(null);
    expect((await POST(request, context)).status).toBe(404);
  });

  it("creates a like and source-linked notification in one transaction", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "actor" } });
    mocks.postFindUnique.mockResolvedValue({ id: "p1", userId: "owner" });
    mocks.likeFindUnique.mockResolvedValue(null);
    mocks.likeCreate.mockResolvedValue({ id: "l1" });
    mocks.likeCount.mockResolvedValue(1);
    const response = await POST(request, context);
    expect(mocks.notificationCreate).toHaveBeenCalledWith({ data: { recipientId: "owner", actorId: "actor", postId: "p1", type: "LIKE", sourceLikeId: "l1" } });
    expect(await response.json()).toMatchObject({ data: { liked: true, likeCount: 1 } });
  });

  it("does not notify for a self-like", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "owner" } });
    mocks.postFindUnique.mockResolvedValue({ id: "p1", userId: "owner" });
    mocks.likeFindUnique.mockResolvedValue(null);
    mocks.likeCreate.mockResolvedValue({ id: "l1" });
    mocks.likeCount.mockResolvedValue(1);
    await POST(request, context);
    expect(mocks.notificationCreate).not.toHaveBeenCalled();
  });

  it("deletes an existing like and relies on source cascade cleanup", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "actor" } });
    mocks.postFindUnique.mockResolvedValue({ id: "p1", userId: "owner" });
    mocks.likeFindUnique.mockResolvedValue({ id: "l1" });
    mocks.likeDelete.mockResolvedValue({ id: "l1" });
    mocks.likeCount.mockResolvedValue(0);
    const response = await POST(request, context);
    expect(mocks.likeDelete).toHaveBeenCalledWith({ where: { id: "l1" } });
    expect(await response.json()).toMatchObject({ data: { liked: false, likeCount: 0 } });
  });

  it("recovers P2002 by reading the concurrent committed like", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "actor" } });
    mocks.postFindUnique.mockResolvedValue({ id: "p1", userId: "owner" });
    mocks.likeFindUnique.mockResolvedValueOnce({ id: "race-like" });
    mocks.likeCount.mockResolvedValue(1);
    mocks.transaction
      .mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" }))
      .mockImplementationOnce(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
    const response = await POST(request, context);
    expect(await response.json()).toMatchObject({ data: { liked: true, likeCount: 1 } });
    expect(mocks.notificationCreate).not.toHaveBeenCalled();
  });

  it("returns a sanitized 500 on database failure", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "actor" } });
    mocks.postFindUnique.mockRejectedValue(new Error("secret database detail"));
    const response = await POST(request, context);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ success: false, error: "서버 오류가 발생했습니다." });
  });
});
