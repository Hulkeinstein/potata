import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), findFirst: vi.fn(), remove: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { oOTDComment: { findFirst: mocks.findFirst, delete: mocks.remove } } }));

import type { NextRequest } from "next/server";
import { DELETE } from "./route";

const request = new Request("http://localhost/api/ootd/p1/comments/c1", { method: "DELETE" }) as NextRequest;
const context = { params: Promise.resolve({ id: "p1", commentId: "c1" }) };

describe("DELETE /api/ootd/[id]/comments/[commentId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 before querying", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await DELETE(request, context)).status).toBe(401);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("constrains lookup to post and comment IDs", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u1" } });
    mocks.findFirst.mockResolvedValue(null);
    expect((await DELETE(request, context)).status).toBe(404);
    expect(mocks.findFirst).toHaveBeenCalledWith({ where: { id: "c1", postId: "p1" }, select: { id: true, userId: true } });
  });

  it("forbids deletion by a different user", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u2" } });
    mocks.findFirst.mockResolvedValue({ id: "c1", userId: "u1" });
    expect((await DELETE(request, context)).status).toBe(403);
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("deletes the owner's comment", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u1" } });
    mocks.findFirst.mockResolvedValue({ id: "c1", userId: "u1" });
    expect((await DELETE(request, context)).status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledWith({ where: { id: "c1" } });
  });
});
