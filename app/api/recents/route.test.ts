import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, rtFindMany, rtUpsert, rtDeleteMany, productFindUnique } = vi.hoisted(() => ({
  authMock: vi.fn(),
  rtFindMany: vi.fn(),
  rtUpsert: vi.fn(),
  rtDeleteMany: vi.fn(),
  productFindUnique: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    recentTryOn: { findMany: rtFindMany, upsert: rtUpsert, deleteMany: rtDeleteMany },
    product: { findUnique: productFindUnique },
  },
}));

import { type NextRequest } from "next/server";
import { GET, POST } from "./route";

function makeReq(method: "POST" | "GET", body?: unknown): NextRequest {
  return new Request("http://localhost/api/recents", {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;
}

describe("/api/recents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET 미인증은 401이며 DB를 호출하지 않는다", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(rtFindMany).not.toHaveBeenCalled();
  });

  it("GET은 본인 최신순 productId 목록(최대 20)을 반환한다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    rtFindMany.mockResolvedValue([{ productId: "3" }, { productId: "1" }]);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { productIds: string[] } };
    expect(json.data.productIds).toEqual(["3", "1"]);
    expect(rtFindMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { productId: true },
    });
  });

  it("POST 미인증은 401", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(makeReq("POST", { productId: "1" }));
    expect(res.status).toBe(401);
    expect(productFindUnique).not.toHaveBeenCalled();
  });

  it("POST productId 누락은 400", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(makeReq("POST", {}));
    expect(res.status).toBe(400);
  });

  it("POST 존재하지 않는 상품은 400", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    productFindUnique.mockResolvedValue(null);
    const res = await POST(makeReq("POST", { productId: "999" }));
    expect(res.status).toBe(400);
    expect(rtUpsert).not.toHaveBeenCalled();
  });

  it("POST 유효 상품은 upsert(맨 앞 이동)하고 초과분이 없으면 deleteMany 미호출", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    productFindUnique.mockResolvedValue({ id: "1" });
    rtFindMany.mockResolvedValue([]); // 초과분 없음

    const res = await POST(makeReq("POST", { productId: "1" }));
    expect(res.status).toBe(200);
    expect(rtUpsert).toHaveBeenCalledWith({
      where: { userId_productId: { userId: "u1", productId: "1" } },
      update: { createdAt: expect.any(Date) },
      create: { userId: "u1", productId: "1" },
    });
    expect(rtDeleteMany).not.toHaveBeenCalled();
  });

  it("POST 시 20개 초과분은 deleteMany로 정리한다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    productFindUnique.mockResolvedValue({ id: "1" });
    rtFindMany.mockResolvedValue([{ id: "old1" }, { id: "old2" }]); // 초과분 2개

    const res = await POST(makeReq("POST", { productId: "1" }));
    expect(res.status).toBe(200);
    expect(rtDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ["old1", "old2"] } } });
  });
});
