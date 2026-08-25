import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: mock 참조를 vi.mock 호이스팅보다 먼저 초기화 (TDZ 회피)
const { authMock, orderCreate, orderFindUnique, orderFindFirst, orderFindMany, txOrderCreate, txProductFindMany, txVariantUpdateMany, productFindUnique } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    orderCreate: vi.fn(),
    orderFindUnique: vi.fn(),
    orderFindFirst: vi.fn(),
    orderFindMany: vi.fn(),
    txOrderCreate: vi.fn(),
    txProductFindMany: vi.fn(),
    txVariantUpdateMany: vi.fn(),
    productFindUnique: vi.fn(),
  }));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findUnique: orderFindUnique,
      findFirst: orderFindFirst,
      findMany: orderFindMany,
      create: orderCreate,
    },
    product: {
      findUnique: productFindUnique,
    },
    // route가 prisma.$transaction(async tx => tx.order.create(...)) 사용
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
      fn({ product: { findMany: txProductFindMany }, productVariant: { updateMany: txVariantUpdateMany }, order: { create: txOrderCreate } })
    ),
  },
}));

import { type NextRequest } from "next/server";
import { POST, GET } from "./route";

// 테스트 fixture: PRODUCTS[0] 값과 동일 (id="1", price=719)
const p = {
  id: "1",
  name: "Kalix T Jacket Black - 26SS",
  brand: "The North Face White Label",
  price: 719,
  imageUrl: "https://kream-phinf.pstatic.net/MjAyNjAxMjJfMTY5/MDAxNzY5MDU5OTg1NDYw.5pHBpFjHOVcZNCXV6ztANvhSF8iN1YR-NKgntgy4soYg.Rfk67XmSl-1tcOF4wT-hPNyxyl7dr3mmgltZqs4zSBwg.PNG/a_fe5a41998e644efb82dd74b30e400d85.png",
};

function makeReq(
  method: "POST" | "GET",
  body?: unknown
): NextRequest {
  return new Request("http://localhost/api/orders", {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;
}

describe("POST /api/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txProductFindMany.mockImplementation(async () => {
      const product = await productFindUnique();
      return product ? [{ ...product, isActive: true, variants: [{ id: "v1", size: "", color: "", stock: 1000, isManuallySoldOut: false }] }] : [];
    });
    txVariantUpdateMany.mockResolvedValue({ count: 1 });
  });

  // 1. POST 미인증 → 401, DB 호출 없음
  it("미인증 요청은 401이며 DB를 호출하지 않는다", async () => {
    authMock.mockResolvedValue(null);

    const res = await POST(makeReq("POST", { items: [{ productId: p.id, quantity: 1 }] }));

    expect(res.status).toBe(401);
    const json = (await res.json()) as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(txOrderCreate).not.toHaveBeenCalled();
    expect(orderCreate).not.toHaveBeenCalled();
  });

  // 3. POST 정상 — 가격 재계산·총계·상태·userId 검증
  it("정상 요청 시 200, txOrderCreate 호출 인자에 서버 재계산 값 포함", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    productFindUnique.mockResolvedValue(p);
    const mockOrder = { id: "order1", userId: "u1", status: "PENDING" };
    txOrderCreate.mockResolvedValue(mockOrder);

    const quantity = 2;
    const res = await POST(
      makeReq("POST", { items: [{ productId: p.id, quantity }] })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; data: unknown };
    expect(json.success).toBe(true);

    const expectedSubtotal = p.price * quantity; // 719 * 2 = 1438
    const expectedShipping = expectedSubtotal > 50000 ? 0 : 3000; // 3000
    const expectedTotal = expectedSubtotal + expectedShipping; // 4438

    expect(txOrderCreate).toHaveBeenCalledTimes(1);
    const callArg = txOrderCreate.mock.calls[0][0] as {
      data: {
        total: number;
        status: string;
        userId: string;
        items: Array<{ price: number }>;
        subtotal: number;
        shipping: number;
      };
    };
    expect(callArg.data.total).toBe(expectedTotal);
    expect(callArg.data.status).toBe("PENDING");
    expect(callArg.data.userId).toBe("u1");
    expect(callArg.data.items[0].price).toBe(p.price); // 서버 조회값
    expect(callArg.data.subtotal).toBe(expectedSubtotal);
    expect(callArg.data.shipping).toBe(expectedShipping);
  });

  // 4. 가격 조작 무시 — 클라이언트가 보낸 price:1은 무시, 서버 DB 가격 사용
  it("클라이언트가 보낸 price 필드는 무시하고 서버 PRODUCTS 가격을 사용한다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    productFindUnique.mockResolvedValue(p);
    txOrderCreate.mockResolvedValue({ id: "order2" });

    // items에 조작된 price:1 포함
    const res = await POST(
      makeReq("POST", {
        items: [{ productId: p.id, quantity: 1, price: 1, name: "hacked" }],
      })
    );

    expect(res.status).toBe(200);
    const callArg = txOrderCreate.mock.calls[0][0] as {
      data: { items: Array<{ price: number }>; total: number };
    };
    // 서버 가격 기준
    expect(callArg.data.items[0].price).toBe(p.price);
    expect(callArg.data.total).toBe(p.price + 3000);
  });

  // 5. 없는 productId → 400, create 미호출
  it("존재하지 않는 productId는 400을 반환하고 DB를 호출하지 않는다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    productFindUnique.mockResolvedValue(null);

    const res = await POST(
      makeReq("POST", { items: [{ productId: "nonexistent", quantity: 1 }] })
    );

    expect(res.status).toBe(400);
    const json = (await res.json()) as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/nonexistent/);
    expect(txOrderCreate).not.toHaveBeenCalled();
  });

  // 6a. quantity 0 → 400
  it("quantity 0은 400을 반환한다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });

    const res = await POST(
      makeReq("POST", { items: [{ productId: p.id, quantity: 0 }] })
    );

    expect(res.status).toBe(400);
    expect(txOrderCreate).not.toHaveBeenCalled();
  });

  // 6b. quantity -1 → 400
  it("quantity 음수는 400을 반환한다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });

    const res = await POST(
      makeReq("POST", { items: [{ productId: p.id, quantity: -1 }] })
    );

    expect(res.status).toBe(400);
    expect(txOrderCreate).not.toHaveBeenCalled();
  });

  // 7. 무료배송 경계 — subtotal > 50000 이면 shipping 0
  it("subtotal이 50000 초과이면 배송비 0(무료배송)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    productFindUnique.mockResolvedValue(p);
    txOrderCreate.mockResolvedValue({ id: "order3" });

    // p.price=719, 70개 → 50330 > 50000
    const quantityForFreeShipping = Math.ceil(50001 / p.price);
    const subtotal = p.price * quantityForFreeShipping;
    expect(subtotal).toBeGreaterThan(50000); // 전제 조건 확인

    const res = await POST(
      makeReq("POST", {
        items: [{ productId: p.id, quantity: quantityForFreeShipping }],
      })
    );

    expect(res.status).toBe(200);
    const callArg = txOrderCreate.mock.calls[0][0] as {
      data: { shipping: number; total: number; subtotal: number };
    };
    expect(callArg.data.shipping).toBe(0);
    expect(callArg.data.total).toBe(subtotal);
  });

  // 7b. subtotal <= 50000 이면 배송비 3000
  it("subtotal이 50000 이하이면 배송비 3000", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    productFindUnique.mockResolvedValue(p);
    txOrderCreate.mockResolvedValue({ id: "order4" });

    // 1개 → 719 < 50000
    const res = await POST(
      makeReq("POST", { items: [{ productId: p.id, quantity: 1 }] })
    );

    expect(res.status).toBe(200);
    const callArg = txOrderCreate.mock.calls[0][0] as {
      data: { shipping: number };
    };
    expect(callArg.data.shipping).toBe(3000);
  });

  // 8. 멱등성 — idempotencyKey가 기존 주문과 일치하면 create 없이 기존 주문 반환
  it("idempotencyKey가 기존 주문과 일치하면 기존 주문을 반환하고 create를 호출하지 않는다", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    productFindUnique.mockResolvedValue(p);
    const existingOrder = { id: "existing-order", userId: "u1", status: "PENDING" };
    orderFindFirst.mockResolvedValue(existingOrder);

    const res = await POST(
      makeReq("POST", {
        items: [{ productId: p.id, quantity: 1 }],
        idempotencyKey: "idem-key-123",
      })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; data: typeof existingOrder };
    expect(json.success).toBe(true);
    expect(json.data).toEqual(existingOrder);
    expect(txOrderCreate).not.toHaveBeenCalled();
    expect(orderFindFirst).toHaveBeenCalledWith({
      where: { idempotencyKey: "idem-key-123", userId: "u1" },
    });
  });
});

describe("GET /api/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 2. GET 미인증 → 401
  it("미인증 요청은 401을 반환한다", async () => {
    authMock.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    const json = (await res.json()) as { success: boolean };
    expect(json.success).toBe(false);
    expect(orderFindMany).not.toHaveBeenCalled();
  });

  // 9. GET 정상 — findMany 호출 인자에 세션 userId 사용, createdAt desc (IDOR 방지)
  it("인증된 요청은 세션 userId로 findMany를 호출하고 createdAt desc 정렬 (IDOR 방지)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    const mockOrders = [{ id: "o1", userId: "u1" }];
    orderFindMany.mockResolvedValue(mockOrders);

    const res = await GET();

    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; data: typeof mockOrders };
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockOrders);

    // IDOR 방지: 쿼리파라미터 userId 무시, 세션값만 사용
    expect(orderFindMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
      orderBy: { createdAt: "desc" },
    });
  });
});
