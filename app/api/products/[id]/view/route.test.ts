import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: mock fn을 vi.mock 호이스팅 전에 초기화
const { productUpdate } = vi.hoisted(() => ({
  productUpdate: vi.fn(),
}));

// prisma.product.update mock — 실 DB 접근 금지
vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      update: productUpdate,
    },
  },
}));

// extractErrorMessage는 순수 함수라 실제 구현 사용(mock 불필요)

import { POST } from "./route";

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
  });

  // ─── Happy Path ─────────────────────────────────────────────────────────────

  it("유효한 id → prisma.product.update(increment:1) 1회 호출, 200 {success:true}", async () => {
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
  });

  // ─── P2025 (존재하지 않는 id) ────────────────────────────────────────────────

  it("update가 P2025 에러 reject → 200 {success:false} (fire-and-forget 정책 — 클라 비크래시)", async () => {
    // Prisma P2025: Record to update not found
    const p2025 = Object.assign(new Error("Record to update not found."), { code: "P2025" });
    productUpdate.mockRejectedValue(p2025);

    const res = await POST(makeReq(), makeParams("non-existent-id"));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(false);
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
