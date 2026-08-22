import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, postFindUnique, postUpdate, postDelete, removeMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  postFindUnique: vi.fn(),
  postUpdate: vi.fn(),
  postDelete: vi.fn(),
  removeMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: { oOTDPost: { findUnique: postFindUnique, update: postUpdate, delete: postDelete } },
}));
vi.mock("@/lib/supabase-storage", () => ({
  removeOOTDImagesByUrl: removeMock,
  uploadOOTDImage: vi.fn(),
  publicUrlToPath: vi.fn(),
}));

import { DELETE, PATCH } from "./route";
import type { NextRequest } from "next/server";

const req = () =>
  new Request("http://localhost/api/ootd/p1", { method: "DELETE" }) as unknown as NextRequest;
const ctx = (id = "p1") => ({ params: Promise.resolve({ id }) });

const patchReq = (body: string) =>
  new Request("http://localhost/api/ootd/p1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  }) as unknown as NextRequest;

describe("PATCH /api/ootd/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("미인증이면 401을 반환하고 body를 처리하지 않는다", async () => {
    authMock.mockResolvedValue(null);

    const res = await PATCH(patchReq("{"), ctx());

    expect(res.status).toBe(401);
    expect(postFindUnique).not.toHaveBeenCalled();
    expect(postUpdate).not.toHaveBeenCalled();
  });

  it("JSON body가 잘못되면 400을 반환한다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });

    const res = await PATCH(patchReq("{"), ctx());

    expect(res.status).toBe(400);
    expect(postFindUnique).not.toHaveBeenCalled();
  });

  it.each([
    ["caption 누락", JSON.stringify({})],
    ["caption 타입 오류", JSON.stringify({ caption: 1 })],
    ["caption 2000자 초과", JSON.stringify({ caption: "a".repeat(2001) })],
  ])("%s이면 400을 반환한다", async (_caseName, body) => {
    authMock.mockResolvedValue({ user: { id: "u1" } });

    const res = await PATCH(patchReq(body), ctx());

    expect(res.status).toBe(400);
    expect(postFindUnique).not.toHaveBeenCalled();
    expect(postUpdate).not.toHaveBeenCalled();
  });

  it("게시물이 없으면 404를 반환한다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    postFindUnique.mockResolvedValue(null);

    const res = await PATCH(patchReq(JSON.stringify({ caption: "new" })), ctx());

    expect(res.status).toBe(404);
    expect(postUpdate).not.toHaveBeenCalled();
  });

  it("타인 게시물이면 403을 반환한다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    postFindUnique.mockResolvedValue({ id: "p1", userId: "other" });

    const res = await PATCH(patchReq(JSON.stringify({ caption: "new" })), ctx());

    expect(res.status).toBe(403);
    expect(postUpdate).not.toHaveBeenCalled();
  });

  it("본인 게시물 caption을 trim해 수정하고 200을 반환한다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    postFindUnique.mockResolvedValue({ id: "p1", userId: "u1" });
    postUpdate.mockResolvedValue({ id: "p1", caption: "new caption" });

    const res = await PATCH(patchReq(JSON.stringify({ caption: "  new caption  " })), ctx());

    expect(res.status).toBe(200);
    expect(postUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { caption: "new caption" },
      select: { id: true, caption: true },
    });
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: { id: "p1", caption: "new caption" },
    });
  });

  it("공백 caption은 null로 정규화한다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    postFindUnique.mockResolvedValue({ id: "p1", userId: "u1" });
    postUpdate.mockResolvedValue({ id: "p1", caption: null });

    const res = await PATCH(patchReq(JSON.stringify({ caption: "   " })), ctx());

    expect(res.status).toBe(200);
    expect(postUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { caption: null },
      select: { id: true, caption: true },
    });
  });

  it("내부 오류를 노출하지 않는 500 응답을 반환한다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    postFindUnique.mockRejectedValue(new Error("postgresql://secret"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const res = await PATCH(patchReq(JSON.stringify({ caption: "new" })), ctx());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "서버 오류가 발생했습니다.",
    });
  });
});

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
