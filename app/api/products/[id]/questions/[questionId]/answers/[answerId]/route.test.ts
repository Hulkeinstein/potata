import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: mock 참조를 vi.mock 호이스팅보다 먼저 초기화
const {
  authMock,
  isAdminMock,
  answerFindUniqueMock,
  answerUpdateMock,
  answerDeleteMock,
  revalidatePathMock,
} = vi.hoisted(() => {
  return {
    authMock: vi.fn(),
    isAdminMock: vi.fn(),
    answerFindUniqueMock: vi.fn(),
    answerUpdateMock: vi.fn(),
    answerDeleteMock: vi.fn(),
    revalidatePathMock: vi.fn(),
  };
});

vi.mock("@/auth", () => ({ auth: authMock }));

vi.mock("@/lib/admin", () => ({
  isAdmin: isAdminMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    answer: {
      findUnique: answerFindUniqueMock,
      update: answerUpdateMock,
      delete: answerDeleteMock,
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: vi.fn(),
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

import { PATCH, DELETE } from "./route";
import type { NextRequest } from "next/server";

// JSON body fake req 헬퍼 (PATCH용)
function makePatchReq(body: unknown): NextRequest {
  return {
    url: "http://localhost/api/products/1/questions/q1/answers/a1",
    json: async () => body,
  } as unknown as NextRequest;
}

// body 없는 req 헬퍼 (DELETE용)
function makeDeleteReq(): NextRequest {
  return new Request(
    "http://localhost/api/products/1/questions/q1/answers/a1",
    { method: "DELETE" },
  ) as unknown as NextRequest;
}

// 공통 params 헬퍼
const makeParams = (
  id = "1",
  questionId = "q1",
  answerId = "a1",
) => Promise.resolve({ id, questionId, answerId });

// 업데이트된 답변 fixture
const updatedAnswer = {
  id: "a1",
  questionId: "q1",
  userId: "admin1",
  content: "수정된 답변",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-06-01T00:00:00Z"),
};

// ─── PATCH ───────────────────────────────────────────────────────────────────

describe("PATCH /api/products/[id]/questions/[questionId]/answers/[answerId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 케이스 ①: admin + 존재하는 answerId → 200 + update 호출
  it("① admin + 존재하는 answerId → 200 + update 호출", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(true);
    // questionId·question.productId 포함 — URL params와 일치하도록 보강
    answerFindUniqueMock.mockResolvedValue({ id: "a1", questionId: "q1", question: { productId: "1" } });
    answerUpdateMock.mockResolvedValue(updatedAnswer);

    const res = await PATCH(
      makePatchReq({ content: "수정된 답변" }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(answerUpdateMock).toHaveBeenCalledOnce();
    expect(answerUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "a1" },
        data: { content: "수정된 답변" },
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/product/1");
  });

  // 케이스 ②: 비admin(isAdmin false) → 403
  it("② 비admin → 403", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "user@example.com" } });
    isAdminMock.mockReturnValue(false);

    const res = await PATCH(
      makePatchReq({ content: "수정 시도" }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toBe("관리자만 답변을 수정할 수 있습니다.");
    expect(answerUpdateMock).not.toHaveBeenCalled();
  });

  // 케이스 ③: 비로그인(auth null) → 401
  it("③ 비로그인 → 401", async () => {
    authMock.mockResolvedValue(null);

    const res = await PATCH(
      makePatchReq({ content: "수정 시도" }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(answerUpdateMock).not.toHaveBeenCalled();
  });

  // 케이스 ④: admin + 없는 answerId(findUnique→null) → 404
  it("④ admin + 없는 answerId → 404", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(true);
    answerFindUniqueMock.mockResolvedValue(null);

    const res = await PATCH(
      makePatchReq({ content: "수정 내용" }),
      { params: makeParams("1", "q1", "nonexistent") },
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe("답변을 찾을 수 없습니다.");
    expect(answerUpdateMock).not.toHaveBeenCalled();
  });

  // 케이스 ④-a: URL questionId와 답변 questionId 불일치(경로 정합 실패) → 404
  it("④-a URL questionId와 답변 questionId 불일치 → 404", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(true);
    // 답변의 실제 questionId("q2")와 URL questionId("q1")가 다름
    answerFindUniqueMock.mockResolvedValue({ id: "a1", questionId: "q2", question: { productId: "1" } });

    const res = await PATCH(
      makePatchReq({ content: "수정 내용" }),
      { params: makeParams("1", "q1", "a1") },
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe("답변을 찾을 수 없습니다.");
    expect(answerUpdateMock).not.toHaveBeenCalled();
  });

  // 케이스 ④-b: URL productId와 question.productId 불일치(경로 정합 실패) → 404
  it("④-b URL productId와 question.productId 불일치 → 404", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(true);
    // 질문의 실제 productId("2")와 URL productId("1")가 다름
    answerFindUniqueMock.mockResolvedValue({ id: "a1", questionId: "q1", question: { productId: "2" } });

    const res = await PATCH(
      makePatchReq({ content: "수정 내용" }),
      { params: makeParams("1", "q1", "a1") },
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe("답변을 찾을 수 없습니다.");
    expect(answerUpdateMock).not.toHaveBeenCalled();
  });

  // 케이스 ⑤: admin + 공백 content → 400
  // 게이트 순서: admin 통과 → body 파싱 → content 검증(400) → findUnique X
  it("⑤ admin + 공백 content → 400", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(true);

    const res = await PATCH(
      makePatchReq({ content: "   " }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("content는 비어있을 수 없습니다.");
    // content 검증이 answer.findUnique 전에 실행
    expect(answerFindUniqueMock).not.toHaveBeenCalled();
    expect(answerUpdateMock).not.toHaveBeenCalled();
  });
});

// ─── DELETE ──────────────────────────────────────────────────────────────────

describe("DELETE /api/products/[id]/questions/[questionId]/answers/[answerId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 케이스 ①: admin + 존재하는 answerId → 200 + delete 호출
  it("① admin + 존재하는 answerId → 200 + delete 호출", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(true);
    // questionId·question.productId 포함 — URL params와 일치하도록 보강
    answerFindUniqueMock.mockResolvedValue({ id: "a1", questionId: "q1", question: { productId: "1" } });
    answerDeleteMock.mockResolvedValue(undefined);

    const res = await DELETE(
      makeDeleteReq(),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(answerDeleteMock).toHaveBeenCalledOnce();
    expect(answerDeleteMock).toHaveBeenCalledWith({ where: { id: "a1" } });
    expect(revalidatePathMock).toHaveBeenCalledWith("/product/1");
  });

  // 케이스 ②: 비admin(isAdmin false) → 403
  it("② 비admin → 403", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "user@example.com" } });
    isAdminMock.mockReturnValue(false);

    const res = await DELETE(
      makeDeleteReq(),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toBe("관리자만 답변을 삭제할 수 있습니다.");
    expect(answerDeleteMock).not.toHaveBeenCalled();
  });

  // 케이스 ③: 없는 answerId(findUnique→null) → 404
  it("③ 없는 answerId → 404", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(true);
    answerFindUniqueMock.mockResolvedValue(null);

    const res = await DELETE(
      makeDeleteReq(),
      { params: makeParams("1", "q1", "nonexistent") },
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe("답변을 찾을 수 없습니다.");
    expect(answerDeleteMock).not.toHaveBeenCalled();
  });

  // 케이스 ③-a: URL questionId와 답변 questionId 불일치(경로 정합 실패) → 404
  it("③-a URL questionId와 답변 questionId 불일치 → 404", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(true);
    // 답변의 실제 questionId("q2")와 URL questionId("q1")가 다름
    answerFindUniqueMock.mockResolvedValue({ id: "a1", questionId: "q2", question: { productId: "1" } });

    const res = await DELETE(
      makeDeleteReq(),
      { params: makeParams("1", "q1", "a1") },
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe("답변을 찾을 수 없습니다.");
    expect(answerDeleteMock).not.toHaveBeenCalled();
  });

  // 케이스 ③-b: URL productId와 question.productId 불일치(경로 정합 실패) → 404
  it("③-b URL productId와 question.productId 불일치 → 404", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(true);
    // 질문의 실제 productId("2")와 URL productId("1")가 다름
    answerFindUniqueMock.mockResolvedValue({ id: "a1", questionId: "q1", question: { productId: "2" } });

    const res = await DELETE(
      makeDeleteReq(),
      { params: makeParams("1", "q1", "a1") },
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe("답변을 찾을 수 없습니다.");
    expect(answerDeleteMock).not.toHaveBeenCalled();
  });
});
