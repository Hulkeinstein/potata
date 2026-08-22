import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { authMock, ootdFindFirst, ootdFindMany, reviewFindFirst, reviewFindMany, questionFindFirst, questionFindMany } = vi.hoisted(() => ({
  authMock: vi.fn(),
  ootdFindFirst: vi.fn(),
  ootdFindMany: vi.fn(),
  reviewFindFirst: vi.fn(),
  reviewFindMany: vi.fn(),
  questionFindFirst: vi.fn(),
  questionFindMany: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    oOTDPost: { findFirst: ootdFindFirst, findMany: ootdFindMany },
    review: { findFirst: reviewFindFirst, findMany: reviewFindMany },
    question: { findFirst: questionFindFirst, findMany: questionFindMany },
  },
}));

import { GET } from "./route";

const request = (query: string) => new NextRequest(`http://localhost/api/users/me/posts?${query}`);
const date = (day: number) => new Date(`2026-08-${String(day).padStart(2, "0")}T00:00:00.000Z`);

describe("GET /api/users/me/posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "owner" } });
  });

  it("returns 401 when the session has no user id", async () => {
    authMock.mockResolvedValue({ user: {} });

    const response = await GET(request("type=ootd"));

    expect(response.status).toBe(401);
    expect(ootdFindMany).not.toHaveBeenCalled();
  });

  it("returns the same safe 400 for an invalid type and foreign cursor", async () => {
    const invalidType = await GET(request("type=answers"));
    ootdFindFirst.mockResolvedValue(null);
    const foreignCursor = await GET(request("type=ootd&cursor=foreign"));

    expect(invalidType.status).toBe(400);
    expect(await invalidType.json()).toEqual({ success: false, error: "Invalid request" });
    expect(foreignCursor.status).toBe(400);
    expect(await foreignCursor.json()).toEqual({ success: false, error: "Invalid request" });
    expect(ootdFindFirst).toHaveBeenCalledWith({
      where: { id: "foreign", userId: "owner" },
      select: { id: true },
    });
    expect(ootdFindMany).not.toHaveBeenCalled();
  });

  it("maps only sanitized OOTD fields and scopes the query to the session owner", async () => {
    ootdFindMany.mockResolvedValue([{ id: "o1", caption: null, imageUrls: ["image"], createdAt: date(1), _count: { likes: 2, comments: 3 }, user: { email: "must-not-leak" } }]);

    const response = await GET(request("type=ootd&userId=other"));

    expect(response.status).toBe(200);
    expect(ootdFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "owner" }, take: 13 }));
    expect(await response.json()).toEqual({ success: true, data: { items: [{ type: "ootd", id: "o1", caption: null, imageUrls: ["image"], createdAt: date(1).toISOString(), likeCount: 2, commentCount: 3 }], nextCursor: null } });
  });

  it("returns 12 OOTD items from take 13 with a stable next cursor", async () => {
    ootdFindMany.mockResolvedValue(Array.from({ length: 13 }, (_, index) => ({ id: `o${index}`, caption: null, imageUrls: [], createdAt: date(1), _count: { likes: 0, comments: 0 } })));

    const response = await GET(request("type=ootd"));
    const body = await response.json();

    expect(body.data.items).toHaveLength(12);
    expect(body.data.nextCursor).toBe("o11");
    expect(ootdFindMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 13 }));
  });

  it("validates a review cursor for the owner and maps the review variant", async () => {
    reviewFindFirst.mockResolvedValue({ id: "r0" });
    reviewFindMany.mockResolvedValue([{ id: "r1", productId: "p1", rating: 5, comment: null, imageUrls: [], createdAt: date(2), updatedAt: date(3), product: { name: "Coat", imageUrl: "coat.jpg", brand: "secret-extra" } }]);

    const response = await GET(request("type=reviews&cursor=r0"));

    expect(reviewFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "owner" }, cursor: { id: "r0" }, skip: 1, take: 13 }));
    expect(await response.json()).toEqual({ success: true, data: { items: [{ type: "review", id: "r1", productId: "p1", productName: "Coat", productImageUrl: "coat.jpg", rating: 5, comment: "", imageUrls: [], createdAt: date(2).toISOString(), updatedAt: date(3).toISOString() }], nextCursor: null } });
  });

  it("maps the question variant with answer count and no raw relations", async () => {
    questionFindMany.mockResolvedValue([{ id: "q1", productId: "p2", content: "Restock?", createdAt: date(4), updatedAt: date(5), product: { name: "Shoes", imageUrl: "shoes.jpg" }, _count: { answers: 2 }, answers: [{ content: "must-not-leak" }] }]);

    const response = await GET(request("type=questions"));

    expect(questionFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "owner" }, take: 13 }));
    expect(await response.json()).toEqual({ success: true, data: { items: [{ type: "question", id: "q1", productId: "p2", productName: "Shoes", productImageUrl: "shoes.jpg", content: "Restock?", answerCount: 2, createdAt: date(4).toISOString(), updatedAt: date(5).toISOString() }], nextCursor: null } });
  });

  it("returns a sanitized 500 when Prisma fails", async () => {
    ootdFindMany.mockRejectedValue(new Error("postgresql://secret"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(request("type=ootd"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ success: false, error: "서버 오류가 발생했습니다." });
  });
});
