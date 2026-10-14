import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: mock fn을 vi.mock 호이스팅 전에 초기화
const { productUpdate, mockRevalidateTag } = vi.hoisted(() => ({
  productUpdate: vi.fn(),
  mockRevalidateTag: vi.fn(),
}));

// prisma.product.update mock — 실 DB 접근 금지
vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      update: productUpdate,
    },
  },
}));

// next/cache mock — revalidateTag 호출 단언용
vi.mock("next/cache", () => ({
  revalidateTag: mockRevalidateTag,
}));

// 실제 요청 제한은 그대로 쓰고 호출(키·순서)만 기록한다 — 키 이름과 "발신지 버킷 먼저" 순서를 테스트로 고정하기 위해
vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  return { ...actual, consumeRateLimit: vi.fn(actual.consumeRateLimit) };
});

import { POST } from "./route";
import { consumeRateLimit, resetRateLimitsForTests } from "@/lib/rate-limit";

/** params를 Promise로 감싸 Next.js 15 async params 인터페이스 맞춤 */
function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

/** 빈 POST 요청 생성(body 불필요한 fire-and-forget 엔드포인트) */
function makeReq(): Request {
  return new Request("http://localhost/api/products/p1/view", { method: "POST" });
}

describe("POST /api/products/[id]/view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitsForTests();
  });

  // ─── Happy Path ─────────────────────────────────────────────────────────────

  it("같은 발신지가 같은 상품을 반복 호출하면 조회수를 더 올리지 않는다(HOT 배지 조작 방지)", async () => {
    productUpdate.mockResolvedValue({ id: "p1", viewCount: 1 });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await POST(makeReq(), makeParams("p1"));
    }
    const blocked = await POST(makeReq(), makeParams("p1"));

    expect(productUpdate).toHaveBeenCalledTimes(5);
    expect(blocked.status).toBe(200);
    expect(await blocked.json()).toEqual({ success: false });
  });

  it("같은 발신지가 상품 id 를 바꿔 가며 호출해도 10분 120회를 넘으면 더 올리지 않는다", async () => {
    productUpdate.mockResolvedValue({ id: "p", viewCount: 1 });

    for (let attempt = 0; attempt < 120; attempt += 1) {
      await POST(makeReq(), makeParams(`p${attempt}`));
    }
    const blocked = await POST(makeReq(), makeParams("p120"));

    expect(productUpdate).toHaveBeenCalledTimes(120);
    expect(blocked.status).toBe(200);
    expect(await blocked.json()).toEqual({ success: false });
  });

  it("발신지 버킷(view-ip:)을 먼저 보고, 막히면 상품별 버킷은 건드리지 않는다", async () => {
    productUpdate.mockResolvedValue({ id: "p", viewCount: 1 });
    for (let attempt = 0; attempt < 120; attempt += 1) {
      await POST(makeReq(), makeParams(`p${attempt}`));
    }
    vi.mocked(consumeRateLimit).mockClear();

    await POST(makeReq(), makeParams("fresh"));

    expect(vi.mocked(consumeRateLimit).mock.calls).toEqual([["view-ip:unknown", 120, 10 * 60 * 1000]]);
  });

  it("허용될 때는 발신지 → 상품 순서로 정확한 키를 쓴다(상품 id 가 \"ip\" 여도 발신지 키와 겹치지 않는다)", async () => {
    productUpdate.mockResolvedValue({ id: "ip", viewCount: 1 });

    await POST(makeReq(), makeParams("ip"));

    expect(vi.mocked(consumeRateLimit).mock.calls.map(([key]) => key)).toEqual(["view-ip:unknown", "view:ip:unknown"]);
  });

  it("유효한 id → prisma.product.update(increment:1) 1회 호출, revalidateTag('hot-products') 1회 호출, 200 {success:true}", async () => {
    productUpdate.mockResolvedValue({ id: "p1", viewCount: 1 });

    const res = await POST(makeReq(), makeParams("p1"));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // update 호출 인자 검증: where.id + data.viewCount.increment=1
    expect(productUpdate).toHaveBeenCalledTimes(1);
    expect(productUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { viewCount: { increment: 1 } },
    });

    // HOT 랭킹 캐시만 무효화 — "products"(카탈로그) 태그는 호출 금지
    // Next.js 15 타입: revalidateTag(tag, profile) — 빈 profile({})로 호출
    expect(mockRevalidateTag).toHaveBeenCalledTimes(1);
    expect(mockRevalidateTag).toHaveBeenCalledWith("hot-products", {});
  });

  // ─── P2025 (존재하지 않는 id) ────────────────────────────────────────────────

  it("update가 P2025 에러 reject → 200 {success:false} (fire-and-forget 정책 — 클라 비크래시), revalidateTag 미호출", async () => {
    // Prisma P2025: Record to update not found
    const p2025 = Object.assign(new Error("Record to update not found."), { code: "P2025" });
    productUpdate.mockRejectedValue(p2025);

    const res = await POST(makeReq(), makeParams("non-existent-id"));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(false);

    // 실패 경로에서는 HOT 랭킹 캐시 무효화 금지
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it("P2025 에러 발생해도 500이 아닌 200 반환 (예외 삼킴 확인)", async () => {
    const p2025 = Object.assign(new Error("Not found"), { code: "P2025" });
    productUpdate.mockRejectedValue(p2025);

    const res = await POST(makeReq(), makeParams("ghost-id"));

    // 500이 아님을 명시적으로 단언
    expect(res.status).not.toBe(500);
    expect(res.status).toBe(200);
  });

  // ─── 그 외 에러 → 500 ────────────────────────────────────────────────────────

  it("DB 연결 실패 등 일반 에러 → 500 {success:false}", async () => {
    productUpdate.mockRejectedValue(new Error("DB 연결 실패"));

    const res = await POST(makeReq(), makeParams("p1"));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it("코드 없는 에러 객체 → 500 반환", async () => {
    const errNoCode = Object.assign(new Error("알 수 없는 에러"), { code: "P9999" });
    productUpdate.mockRejectedValue(errNoCode);

    const res = await POST(makeReq(), makeParams("p1"));

    expect(res.status).toBe(500);
  });

  it("문자열 에러 throw → 500 반환", async () => {
    productUpdate.mockRejectedValue("unexpected string error");

    const res = await POST(makeReq(), makeParams("p1"));

    expect(res.status).toBe(500);
  });
});
