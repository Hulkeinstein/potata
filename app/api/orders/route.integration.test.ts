/**
 * /api/orders 통합 테스트 — 실 Postgres 사용
 *
 * 전제: DATABASE_URL / DIRECT_URL 환경 변수가 실제 DB를 가리켜야 함.
 * (CI: postgres:16 컨테이너 / 로컬: .env.local의 Supabase)
 * DATABASE_URL 없으면 테스트 실패가 맞음 — silent skip 없음.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

// vi.hoisted: mock 참조를 vi.mock 호이스팅보다 먼저 초기화 (TDZ 회피)
const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/auth", () => ({ auth: authMock }));

import { POST, GET } from "./route";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

const TEST_EMAIL = "order-itest@example.test";
// CI는 seed를 실행하지 않으므로 테스트용 Product를 직접 upsert
const TEST_PRODUCT = {
  id: "itest-prod",
  name: "Integration Test Product",
  brand: "Test Brand",
  price: 719,
  imageUrl: "https://example.com/test.png",
  category: "Outer",
};

// 요청 헬퍼
function makeReq(method: "POST" | "GET", body?: unknown): NextRequest {
  return new Request("http://localhost/api/orders", {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;
}

// 통합 테스트는 실 DB(CI postgres)에서만 실행 — 로컬 npm run test는 건너뜀(라이브 Supabase 오염·42P05 방지).
const RUN_INTEGRATION = !!process.env.CI || !!process.env.RUN_INTEGRATION;

let userId: string;

beforeAll(async () => {
  if (!RUN_INTEGRATION) return;
  // 이메일 충돌 방지: 이전 테스트 잔존 데이터 먼저 삭제
  const existingUser = await prisma.user.findUnique({
    where: { email: TEST_EMAIL },
  });
  if (existingUser) {
    await prisma.order.deleteMany({ where: { userId: existingUser.id } });
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  }

  // CI는 seed를 실행하지 않으므로 테스트용 Product를 직접 upsert
  await prisma.product.upsert({
    where: { id: TEST_PRODUCT.id },
    create: TEST_PRODUCT,
    update: {},
  });

  // 테스트 유저 생성
  const user = await prisma.user.create({
    data: {
      email: TEST_EMAIL,
      name: "OrderITest",
      passwordHash: "x",
      emailVerified: true,
    },
  });
  userId = user.id;

  // auth mock: 생성된 실 userId 반환
  authMock.mockResolvedValue({ user: { id: userId } });
});

afterAll(async () => {
  if (!RUN_INTEGRATION) return;
  await prisma.order.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  await prisma.product.deleteMany({ where: { id: TEST_PRODUCT.id } });
  await prisma.$disconnect();
});

describe.skipIf(!RUN_INTEGRATION)("POST /api/orders (통합 — 실 DB)", () => {
  it("테스트 1 (생성): 주문이 DB에 올바른 값으로 생성된다", async () => {
    const quantity = 2;
    const expectedSubtotal = TEST_PRODUCT.price * quantity; // 719 * 2 = 1438
    const expectedShipping = expectedSubtotal > 50000 ? 0 : 3000; // 3000
    const expectedTotal = expectedSubtotal + expectedShipping; // 4438

    const res = await POST(
      makeReq("POST", {
        items: [{ productId: TEST_PRODUCT.id, quantity }],
        idempotencyKey: "itest-key-1",
      })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; data: unknown };
    expect(json.success).toBe(true);

    // DB에서 직접 확인
    const order = await prisma.order.findFirst({ where: { userId } });
    expect(order).not.toBeNull();
    expect(order!.status).toBe("PENDING");
    expect(order!.total).toBe(expectedTotal);
    expect(order!.subtotal).toBe(expectedSubtotal);
    expect(order!.shipping).toBe(expectedShipping);

    // items JSON 스냅샷 역직렬화 검증
    const items = order!.items as Array<{
      productId: string;
      price: number;
      quantity: number;
    }>;
    expect(Array.isArray(items)).toBe(true);
    expect(items[0].productId).toBe(TEST_PRODUCT.id);
    expect(items[0].price).toBe(TEST_PRODUCT.price);
    expect(items[0].quantity).toBe(quantity);
  });

  it("테스트 2 (멱등성): 동일 idempotencyKey 재호출 시 주문이 중복 생성되지 않는다", async () => {
    // 동일 idempotencyKey "itest-key-1"로 재호출
    const res = await POST(
      makeReq("POST", {
        items: [{ productId: TEST_PRODUCT.id, quantity: 1 }],
        idempotencyKey: "itest-key-1",
      })
    );

    expect(res.status).toBe(200);
    // 주문이 1개만 존재해야 함 (중복 생성 안 됨)
    const count = await prisma.order.count({ where: { userId } });
    expect(count).toBe(1);
  });
});

describe.skipIf(!RUN_INTEGRATION)("GET /api/orders (통합 — 실 DB)", () => {
  it("테스트 3 (GET): 인증 유저의 주문 목록이 반환된다", async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      success: boolean;
      data: Array<{ userId: string; id: string }>;
    };
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);

    // 본인 주문이 포함되어야 함
    const hasOurOrder = json.data.some((o) => o.userId === userId);
    expect(hasOurOrder).toBe(true);

    // 모든 반환된 주문이 본인 것이어야 함 (IDOR 방지)
    const allBelongToUser = json.data.every((o) => o.userId === userId);
    expect(allBelongToUser).toBe(true);
  });
});
