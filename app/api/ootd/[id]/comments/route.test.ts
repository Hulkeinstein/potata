import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), postFindUnique: vi.fn(), commentFindFirst: vi.fn(), commentFindMany: vi.fn(),
  commentCreate: vi.fn(), notificationCreate: vi.fn(), transaction: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  oOTDPost: { findUnique: mocks.postFindUnique },
  oOTDComment: { findFirst: mocks.commentFindFirst, findMany: mocks.commentFindMany },
  $transaction: mocks.transaction,
} }));

import type { NextRequest } from "next/server";
import { GET, POST } from "./route";

const context = { params: Promise.resolve({ id: "p1" }) };
const getRequest = (cursor?: string) => new Request(`http://localhost/api/ootd/p1/comments${cursor ? `?cursor=${cursor}` : ""}`) as NextRequest;
const postRequest = (body: string) => new Request("http://localhost/api/ootd/p1/comments", { method: "POST", headers: { "content-type": "application/json" }, body }) as NextRequest;
const row = { id: "c1", postId: "p1", content: "Nice", createdAt: new Date("2026-01-01T00:00:00Z"), user: { id: "u1", name: "A", handle: "a", avatar: null } };
const tx = { oOTDComment: { create: mocks.commentCreate }, notification: { create: mocks.notificationCreate } };

describe("/api/ootd/[id]/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
  });

  it("lists comments publicly with public author projection and ownership", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u1" } });
    mocks.postFindUnique.mockResolvedValue({ id: "p1" });
    mocks.commentFindMany.mockResolvedValue([row]);
    const response = await GET(getRequest(), context);
    expect(await response.json()).toMatchObject({ data: { items: [{ isMine: true, author: { name: "A" } }], nextCursor: null } });
    expect(mocks.commentFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { postId: "p1" }, take: 20, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }));
  });

  it("rejects a cursor from another post", async () => {
    mocks.auth.mockResolvedValue(null);
    mocks.postFindUnique.mockResolvedValue({ id: "p1" });
    mocks.commentFindFirst.mockResolvedValue(null);
    const response = await GET(getRequest("foreign"), context);
    expect(response.status).toBe(400);
    expect(mocks.commentFindMany).not.toHaveBeenCalled();
  });

  it("returns 404 when listing a missing post", async () => {
    mocks.auth.mockResolvedValue(null);
    mocks.postFindUnique.mockResolvedValue(null);
    expect((await GET(getRequest(), context)).status).toBe(404);
  });

  it("authenticates before parsing create input", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await POST(postRequest("not-json"), context);
    expect(response.status).toBe(401);
  });

  it.each(["not-json", JSON.stringify({ content: "   " }), JSON.stringify({ content: "x".repeat(501) })])("rejects invalid create content", async (body) => {
    mocks.auth.mockResolvedValue({ user: { id: "actor" } });
    expect((await POST(postRequest(body), context)).status).toBe(400);
    expect(mocks.postFindUnique).not.toHaveBeenCalled();
  });

  it("creates a comment and notification transactionally", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "actor" } });
    mocks.postFindUnique.mockResolvedValue({ id: "p1", userId: "owner" });
    mocks.commentCreate.mockResolvedValue({ ...row, user: { ...row.user, id: "actor" } });
    const response = await POST(postRequest(JSON.stringify({ content: "  Nice  " })), context);
    expect(response.status).toBe(201);
    expect(mocks.commentCreate).toHaveBeenCalledWith(expect.objectContaining({ data: { postId: "p1", userId: "actor", content: "Nice" } }));
    expect(mocks.notificationCreate).toHaveBeenCalledWith({ data: { recipientId: "owner", actorId: "actor", postId: "p1", type: "COMMENT", sourceCommentId: "c1" } });
  });

  it("does not notify on a self-comment", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "owner" } });
    mocks.postFindUnique.mockResolvedValue({ id: "p1", userId: "owner" });
    mocks.commentCreate.mockResolvedValue(row);
    await POST(postRequest(JSON.stringify({ content: "Nice" })), context);
    expect(mocks.notificationCreate).not.toHaveBeenCalled();
  });

  it("sanitizes database errors", async () => {
    mocks.auth.mockResolvedValue(null);
    mocks.postFindUnique.mockRejectedValue(new Error("secret"));
    const response = await GET(getRequest(), context);
    expect(await response.json()).toEqual({ success: false, error: "서버 오류가 발생했습니다." });
  });
});
