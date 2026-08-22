import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { notification: { findFirst: mocks.findFirst, findMany: mocks.findMany, count: mocks.count } } }));

import type { NextRequest } from "next/server";
import { GET } from "./route";

const request = (cursor?: string) => new Request(`http://localhost/api/notifications${cursor ? `?cursor=${cursor}` : ""}`) as NextRequest;
const row = { id: "n1", type: "COMMENT", readAt: null, createdAt: new Date("2026-01-01T00:00:00Z"), actor: { id: "a1", name: "Actor", handle: "actor", avatar: null }, post: { id: "p1", imageUrls: ["image"], caption: "fit" } };

describe("GET /api/notifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 before querying", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("scopes rows and total unread count to the recipient", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "recipient" } });
    mocks.findMany.mockResolvedValue([row]);
    mocks.count.mockResolvedValue(27);
    const response = await GET(request());
    expect(await response.json()).toMatchObject({ data: { items: [{ actor: { name: "Actor" }, post: { imageUrl: "image" } }], unreadCount: 27 } });
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { recipientId: "recipient" }, take: 20, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }));
    expect(mocks.count).toHaveBeenCalledWith({ where: { recipientId: "recipient", readAt: null } });
  });

  it("rejects a cursor not owned by the recipient", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "recipient" } });
    mocks.findFirst.mockResolvedValue(null);
    const response = await GET(request("foreign"));
    expect(response.status).toBe(400);
    expect(mocks.findFirst).toHaveBeenCalledWith({ where: { id: "foreign", recipientId: "recipient" }, select: { id: true } });
  });

  it("returns a sanitized 500", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "recipient" } });
    mocks.findMany.mockRejectedValue(new Error("secret"));
    mocks.count.mockResolvedValue(0);
    const response = await GET(request());
    expect(await response.json()).toEqual({ success: false, error: "서버 오류가 발생했습니다." });
  });
});
