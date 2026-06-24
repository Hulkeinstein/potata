import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: mock 참조를 vi.mock 호이스팅보다 먼저 초기화
const {
  authMock,
  hasPurchasedProductMock,
  recomputeProductRatingMock,
  revalidateTagMock,
  revalidatePathMock,
  reviewFindManyMock,
  reviewFindUniqueMock,
  reviewUpsertMock,
  reviewDeleteMock,
  productFindUniqueMock,
  transactionMock,
} = vi.hoisted(() => {
  const reviewUpsertMock = vi.fn();
  const reviewDeleteMock = vi.fn();
  const reviewAggregateMock = vi.fn();
  const productUpdateMock = vi.fn();

  // $transaction: 콜백 실행형 — tx(txMock)를 전달해 콜백을 실제로 호출
  const txMock = {
    review: {
      upsert: reviewUpsertMock,
      delete: reviewDeleteMock,
      aggregate: reviewAggregateMock,
    },
    product: { update: productUpdateMock },
  };

  const transactionMock = vi.fn(async (cb: (tx: typeof txMock) => Promise<unknown>) =>
    cb(txMock),
  );

  return {
    authMock: vi.fn(),
    hasPurchasedProductMock: vi.fn(),
    recomputeProductRatingMock: vi.fn(),
    revalidateTagMock: vi.fn(),
    revalidatePathMock: vi.fn(),
    reviewFindManyMock: vi.fn(),
    reviewFindUniqueMock: vi.fn(),
    reviewUpsertMock,
    reviewDeleteMock,
    productFindUniqueMock: vi.fn(),
    transactionMock,
  };
});

vi.mock("@/auth", () => ({ auth: authMock }));

vi.mock("@/lib/reviews", () => ({
  hasPurchasedProduct: hasPurchasedProductMock,
  recomputeProductRating: recomputeProductRatingMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    review: {
      findMany: reviewFindManyMock,
      findUnique: reviewFindUniqueMock,
      upsert: reviewUpsertMock,
      delete: reviewDeleteMock,
    },
    product: {
      findUnique: productFindUniqueMock,
    },
    $transaction: transactionMock,
  },
}));

vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
  revalidatePath: revalidatePathMock,
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

import { GET, POST, DELETE } from "./route";
import type { NextRequest } from "next/server";

// 공통 params 헬퍼
const makeParams = (id = "p1") =>
  Promise.resolve({ id });

// JSON body 기반 fake Request 헬퍼
function makeRequest(
  method: string,
  body?: Record<string, unknown>,
): NextRequest {
  return new Request(`http://localhost/api/products/p1/reviews`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;
}


describe("GET /api/products/[id]/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 케이스 ①: 리뷰 없을 때 빈 목록 + averageRating null
  it("① 빈 목록 → reviews:[], averageRating:null", async () => {
    reviewFindManyMock.mockResolvedValue([]);
    productFindUniqueMock.mockResolvedValue({ rating: null, reviewCount: 0 });

    const res = await GET(
      makeRequest("GET"),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.reviews).toEqual([]);
    expect(json.data.averageRating).toBeNull();
  });
});

describe("POST /api/products/[id]/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 케이스 ②: 비로그인 → 401
  it("② 비로그인 → 401", async () => {
    authMock.mockResolvedValue(null);

    const res = await POST(
      makeRequest("POST", { rating: 4, comment: "좋음" }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
  });

  // 케이스 ③: 비구매자 → 403
  it("③ 비구매자 → 403", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(false);

    const res = await POST(
      makeRequest("POST", { rating: 4, comment: "좋음" }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
  });

  // 케이스 ④: rating=6 → 400
  it("④ rating=6 → 400", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });

    const res = await POST(
      makeRequest("POST", { rating: 6, comment: "좋음" }),
      { params: makeParams() },
    );
    const json = await res.json();

    // rating 검증은 product 존재 확인보다 먼저 실행됨
    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });

  // 케이스 ⑧: comment가 number → 400 (M2)
  it("⑧ comment=number → 400", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(true);

    const res = await POST(
      makeRequest("POST", { rating: 4, comment: 12345 }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid comment");
  });

  // 케이스 ⑨: comment 2001자 → 400 (M2)
  it("⑨ comment 2001자 → 400", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(true);

    const res = await POST(
      makeRequest("POST", { rating: 4, comment: "a".repeat(2001) }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Comment too long (max 2000)");
  });

  // 케이스 ⑪: session.user.id 없음(H1) → 401
  it("⑪ session.user 있지만 id 없음 → 401", async () => {
    authMock.mockResolvedValue({ user: {} }); // id 없는 세션

    const res = await POST(
      makeRequest("POST", { rating: 4, comment: "좋음" }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
  });

  // 케이스 ⑤: 구매자 정상 → upsert + recompute 호출 + 201
  it("⑤ 구매자 정상 → upsert + recompute 호출 + 201", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(true);

    const upsertResult = {
      id: "r1",
      userId: "u1",
      productId: "p1",
      rating: 4,
      comment: "좋아요",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    };
    reviewUpsertMock.mockResolvedValue(upsertResult);
    recomputeProductRatingMock.mockResolvedValue(undefined);

    const res = await POST(
      makeRequest("POST", { rating: 4, comment: "좋아요" }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    // $transaction이 콜백 실행형으로 구성 → upsert와 recompute가 실제 호출됨
    expect(reviewUpsertMock).toHaveBeenCalledOnce();
    expect(recomputeProductRatingMock).toHaveBeenCalledOnce();
    // revalidatePath + revalidateTag 캐시 무효화 호출 확인
    expect(revalidatePathMock).toHaveBeenCalledWith("/product/p1");
    expect(revalidateTagMock).toHaveBeenCalledWith("products", {});
  });
});

describe("DELETE /api/products/[id]/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 케이스 ⑥: 타인 리뷰(본인 것 없음) → 404
  it("⑥ 본인 리뷰 없음 → 404", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    reviewFindUniqueMock.mockResolvedValue(null);

    const res = await DELETE(
      makeRequest("DELETE"),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
  });

  // 케이스 ⑦: 본인 리뷰 삭제 → delete + recompute + 200
  it("⑦ 본인 리뷰 삭제 → delete + recompute 호출 + 200", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    reviewFindUniqueMock.mockResolvedValue({ id: "r1" });
    reviewDeleteMock.mockResolvedValue(undefined);
    recomputeProductRatingMock.mockResolvedValue(undefined);

    const res = await DELETE(
      makeRequest("DELETE"),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(reviewDeleteMock).toHaveBeenCalledOnce();
    expect(recomputeProductRatingMock).toHaveBeenCalledOnce();
    expect(revalidatePathMock).toHaveBeenCalledWith("/product/p1");
    expect(revalidateTagMock).toHaveBeenCalledWith("products", {});
  });
});
