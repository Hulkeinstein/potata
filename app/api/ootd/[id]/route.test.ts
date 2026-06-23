import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, postFindUnique, postDelete, removeMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  postFindUnique: vi.fn(),
  postDelete: vi.fn(),
  removeMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: { oOTDPost: { findUnique: postFindUnique, delete: postDelete } },
}));
vi.mock("@/lib/supabase-storage", () => ({
  removeOOTDImagesByUrl: removeMock,
  uploadOOTDImage: vi.fn(),
  publicUrlToPath: vi.fn(),
}));

import { DELETE } from "./route";
import type { NextRequest } from "next/server";

const req = () =>
  new Request("http://localhost/api/ootd/p1", { method: "DELETE" }) as unknown as NextRequest;
const ctx = (id = "p1") => ({ params: Promise.resolve({ id }) });

describe("DELETE /api/ootd/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("미인증은 401", async () => {
    authMock.mockResolvedValue(null);
    const res = await DELETE(req(), ctx());
    expect(res.status).toBe(401);
    expect(postDelete).not.toHaveBeenCalled();
  });

  it("없는 게시물은 404", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    postFindUnique.mockResolvedValue(null);
    const res = await DELETE(req(), ctx());
    expect(res.status).toBe(404);
  });

  it("타인 게시물은 403 — delete·Storage 미호출", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    postFindUnique.mockResolvedValue({ id: "p1", userId: "other", imageUrls: ["i1"] });
    const res = await DELETE(req(), ctx());
    expect(res.status).toBe(403);
    expect(postDelete).not.toHaveBeenCalled();
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("본인 게시물: DB 삭제 + Storage 동기 삭제", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    postFindUnique.mockResolvedValue({ id: "p1", userId: "u1", imageUrls: ["i1", "i2"] });
    postDelete.mockResolvedValue({ id: "p1" });
    removeMock.mockResolvedValue(undefined);

    const res = await DELETE(req(), ctx());
    expect(res.status).toBe(200);
    expect(postDelete).toHaveBeenCalledWith({ where: { id: "p1" } });
    expect(removeMock).toHaveBeenCalledWith(["i1", "i2"]);
  });
});
