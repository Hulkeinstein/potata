/**
 * /api/cart 통합 테스트 — 실 Postgres 사용
 *
 * 전제: DATABASE_URL / DIRECT_URL 이 실제 DB를 가리켜야 함.
 * (CI: postgres:16 컨테이너 / 로컬: Supabase — pgbouncer 42P05로 실패할 수 있으며
 *  orders 통합 테스트 선례대로 CI에서 그린이면 통과로 본다.)
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/auth", () => ({ auth: authMock }));

import { GET, PUT } from "./route";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

const TEST_EMAIL = "cart-itest@example.test";
const TEST_PRODUCT = {
  id: "itest-cart-prod",
  name: "Cart Integration Product",
  brand: "Test Brand",
  price: 500,
  imageUrl: "https://example.com/test.png",
  category: "Top",
};

function makeReq(method: "PUT" | "GET", body?: unknown): NextRequest {
  return new Request("http://localhost/api/cart", {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;
}

let userId: string;

beforeAll(async () => {
  const existingUser = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
  if (existingUser) {
    await prisma.cartItem.deleteMany({ where: { userId: existingUser.id } });
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  }

  await prisma.product.upsert({
    where: { id: TEST_PRODUCT.id },
    create: TEST_PRODUCT,
    update: {},
  });

  const user = await prisma.user.create({
    data: { email: TEST_EMAIL, name: "CartITest", passwordHash: "x", emailVerified: true },
  });
  userId = user.id;
  authMock.mockResolvedValue({ user: { id: userId } });
});

afterAll(async () => {
  await prisma.cartItem.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  await prisma.product.deleteMany({ where: { id: TEST_PRODUCT.id } });
  await prisma.$disconnect();
});

describe("/api/cart (통합 — 실 DB)", () => {
  it("테스트 1 (PUT→GET 왕복): 저장·product 재조립·size/color 정규화", async () => {
    const putRes = await PUT(
      makeReq("PUT", { items: [{ productId: TEST_PRODUCT.id, size: "M", quantity: 2 }] })
    );
    expect(putRes.status).toBe(200);

    const getRes = await GET();
    expect(getRes.status).toBe(200);
    const json = (await getRes.json()) as {
      data: { items: Array<{ product: { id: string; price: number }; quantity: number; size?: string; color?: string }> };
    };
    expect(json.data.items).toHaveLength(1);
    expect(json.data.items[0].product.id).toBe(TEST_PRODUCT.id);
    expect(json.data.items[0].product.price).toBe(TEST_PRODUCT.price); // 서버 재조회 현재가
    expect(json.data.items[0].quantity).toBe(2);
    expect(json.data.items[0].size).toBe("M");
    expect(json.data.items[0].color).toBeUndefined(); // 미지정 → DB "" → 응답 undefined
  });

  it("테스트 2 (전체 교체): 동일 라인 재PUT 시 중복 없이 1행·수량 갱신", async () => {
    await PUT(makeReq("PUT", { items: [{ productId: TEST_PRODUCT.id, size: "M", quantity: 5 }] }));
    const count = await prisma.cartItem.count({ where: { userId } });
    expect(count).toBe(1); // @@unique + 전체 교체 → 1행
    const row = await prisma.cartItem.findFirst({ where: { userId } });
    expect(row!.quantity).toBe(5);
    expect(row!.color).toBe(""); // NOT NULL "" 정규화 확인
  });

  it("테스트 3 (비우기): 빈 배열 PUT 시 장바구니 비움", async () => {
    const res = await PUT(makeReq("PUT", { items: [] }));
    expect(res.status).toBe(200);
    const count = await prisma.cartItem.count({ where: { userId } });
    expect(count).toBe(0);
  });
});
