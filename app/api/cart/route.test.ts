import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  authMock,
  ciFindMany,
  ciDeleteMany,
  ciCreateMany,
  productFindMany,
  txMock,
  getProductByIdMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  ciFindMany: vi.fn(),
  ciDeleteMany: vi.fn(),
  ciCreateMany: vi.fn(),
  productFindMany: vi.fn(),
  txMock: vi.fn(async (arr: unknown) => arr),
  getProductByIdMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    cartItem: { findMany: ciFindMany, deleteMany: ciDeleteMany, createMany: ciCreateMany },
    product: { findMany: productFindMany },
    $transaction: txMock,
  },
}));
vi.mock("@/lib/products", () => ({ getProductById: getProductByIdMock }));

import { type NextRequest } from "next/server";
import { GET, PUT } from "./route";

const product = {
  id: "1",
  name: "Kalix T Jacket",
  brand: "TNF",
  price: 719,
  imageUrl: "https://example.com/p.png",
  images: [],
  category: "Outer",
  sizes: [],
  colors: [],
};

function makeReq(method: "PUT" | "GET", body?: unknown): NextRequest {
  return new Request("http://localhost/api/cart", {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;
}

describe("/api/cart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txMock.mockImplementation(async (arr: unknown) => arr);
  });

  it("GET 미인증은 401이며 DB를 호출하지 않는다", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(ciFindMany).not.toHaveBeenCalled();
  });

  it("GET은 productId로 product를 재조립해 반환한다(size '' → undefined)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    ciFindMany.mockResolvedValue([{ productId: "1", quantity: 2, size: "M", color: "" }]);
    getProductByIdMock.mockResolvedValue(product);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { items: Array<{ product: { id: string; price: number }; quantity: number; size?: string; color?: string }> } };
    expect(json.data.items).toHaveLength(1);
    expect(json.data.items[0].product.id).toBe("1");
    expect(json.data.items[0].product.price).toBe(719); // 서버 재조회 현재가
    expect(json.data.items[0].quantity).toBe(2);
    expect(json.data.items[0].size).toBe("M");
    expect(json.data.items[0].color).toBeUndefined(); // "" → undefined
    expect(ciFindMany).toHaveBeenCalledWith({ where: { userId: "u1" }, orderBy: { createdAt: "asc" } });
  });

  it("GET은 삭제/품절(getProductById null) 상품을 제외한다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    ciFindMany.mockResolvedValue([{ productId: "999", quantity: 1, size: "", color: "" }]);
    getProductByIdMock.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { items: unknown[] } };
    expect(json.data.items).toHaveLength(0);
  });

  it("PUT 미인증은 401이며 DB를 호출하지 않는다", async () => {
    authMock.mockResolvedValue(null);
    const res = await PUT(makeReq("PUT", { items: [] }));
    expect(res.status).toBe(401);
    expect(txMock).not.toHaveBeenCalled();
  });

  it("PUT quantity가 1 미만이면 400", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    const res = await PUT(makeReq("PUT", { items: [{ productId: "1", size: "", color: "", quantity: 0 }] }));
    expect(res.status).toBe(400);
    expect(txMock).not.toHaveBeenCalled();
  });

  it("PUT은 존재 상품만 정규화 저장하고 트랜잭션으로 교체한다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    productFindMany.mockResolvedValue([{ id: "1" }]);

    const res = await PUT(makeReq("PUT", { items: [{ productId: "1", quantity: 1 }] }));
    expect(res.status).toBe(200);
    expect(ciDeleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
    expect(ciCreateMany).toHaveBeenCalledWith({
      data: [{ userId: "u1", productId: "1", size: "", color: "", quantity: 1 }],
    });
  });

  it("PUT은 동일 (productId,size,color) 라인의 수량을 합산한다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    productFindMany.mockResolvedValue([{ id: "1" }]);

    const res = await PUT(
      makeReq("PUT", {
        items: [
          { productId: "1", size: "M", color: "", quantity: 1 },
          { productId: "1", size: "M", color: "", quantity: 2 },
        ],
      })
    );
    expect(res.status).toBe(200);
    expect(ciCreateMany).toHaveBeenCalledWith({
      data: [{ userId: "u1", productId: "1", size: "M", color: "", quantity: 3 }],
    });
  });

  it("PUT은 존재하지 않는 상품 라인을 제외한다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    productFindMany.mockResolvedValue([]); // 어떤 상품도 존재하지 않음

    const res = await PUT(makeReq("PUT", { items: [{ productId: "999", quantity: 1 }] }));
    expect(res.status).toBe(200);
    expect(ciDeleteMany).toHaveBeenCalled();
    expect(ciCreateMany).not.toHaveBeenCalled(); // 유효 라인 0 → createMany 미호출
  });
});
