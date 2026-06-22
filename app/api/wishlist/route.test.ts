import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: mock 참조를 vi.mock 호이스팅보다 먼저 초기화 (orders 테스트 패턴 복제)
const { authMock, wlFindMany, wlFindUnique, wlDelete, wlCreateMany, productFindUnique } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    wlFindMany: vi.fn(),
    wlFindUnique: vi.fn(),
    wlDelete: vi.fn(),
    wlCreateMany: vi.fn(),
    productFindUnique: vi.fn(),
  }));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    wishlistItem: {
      findMany: wlFindMany,
      findUnique: wlFindUnique,
      delete: wlDelete,
      createMany: wlCreateMany,
    },
    product: { findUnique: productFindUnique },
  },
}));

import { type NextRequest } from "next/server";
import { GET, POST } from "./route";

function makeReq(method: "POST" | "GET", body?: unknown): NextRequest {
  return new Request("http://localhost/api/wishlist", {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;
}

describe("/api/wishlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET 미인증은 401이며 DB를 호출하지 않는다", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(wlFindMany).not.toHaveBeenCalled();
  });

  it("GET은 본인 productId 목록을 반환한다(session.user.id 필터)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    wlFindMany.mockResolvedValue([{ productId: "1" }, { productId: "3" }]);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; data: { productIds: string[] } };
    expect(json.success).toBe(true);
    expect(json.data.productIds).toEqual(["1", "3"]);
    expect(wlFindMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
      select: { productId: true },
    });
  });

  it("POST 미인증은 401이며 DB를 호출하지 않는다", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(makeReq("POST", { productId: "1" }));
    expect(res.status).toBe(401);
    expect(productFindUnique).not.toHaveBeenCalled();
  });

  it("POST productId 누락은 400", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(makeReq("POST", {}));
    expect(res.status).toBe(400);
    expect(productFindUnique).not.toHaveBeenCalled();
  });

  it("POST 존재하지 않는 상품은 400", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    productFindUnique.mockResolvedValue(null);
    const res = await POST(makeReq("POST", { productId: "999" }));
    expect(res.status).toBe(400);
    expect(wlFindUnique).not.toHaveBeenCalled();
  });

  it("POST 없던 상품은 createMany 호출 + liked:true (toggle on)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    productFindUnique.mockResolvedValue({ id: "1" });
    wlFindUnique.mockResolvedValue(null);

    const res = await POST(makeReq("POST", { productId: "1" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { liked: boolean } };
    expect(json.data.liked).toBe(true);
    expect(wlCreateMany).toHaveBeenCalledWith({
      data: [{ userId: "u1", productId: "1" }],
      skipDuplicates: true,
    });
    expect(wlDelete).not.toHaveBeenCalled();
  });

  it("POST 이미 있던 상품은 delete 호출 + liked:false (toggle off)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    productFindUnique.mockResolvedValue({ id: "1" });
    wlFindUnique.mockResolvedValue({ id: "w1", userId: "u1", productId: "1" });

    const res = await POST(makeReq("POST", { productId: "1" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { liked: boolean } };
    expect(json.data.liked).toBe(false);
    expect(wlDelete).toHaveBeenCalledWith({ where: { id: "w1" } });
    expect(wlCreateMany).not.toHaveBeenCalled();
  });
});
