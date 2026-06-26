import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: mock 참조를 vi.mock 호이스팅보다 먼저 초기화
const {
  authMock,
  isAdminMock,
  questionFindUniqueMock,
  answerCreateMock,
  revalidatePathMock,
} = vi.hoisted(() => {
  return {
    authMock: vi.fn(),
    isAdminMock: vi.fn(),
    questionFindUniqueMock: vi.fn(),
    answerCreateMock: vi.fn(),
    revalidatePathMock: vi.fn(),
  };
});

vi.mock("@/auth", () => ({ auth: authMock }));

vi.mock("@/lib/admin", () => ({
  isAdmin: isAdminMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    question: {
      findUnique: questionFindUniqueMock,
    },
    answer: {
      create: answerCreateMock,
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: vi.fn(),
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

import { POST } from "./route";
import type { NextRequest } from "next/server";

// JSON body fake req 헬퍼
function makePostReq(body: unknown): NextRequest {
  return {
    url: "http://localhost/api/products/1/questions/q1/answers",
    json: async () => body,
  } as unknown as NextRequest;
}

// 공통 params 헬퍼
const makeParams = (id = "1", questionId = "q1") =>
  Promise.resolve({ id, questionId });

// 정상 답변 fixture
const createdAnswer = {
  id: "a1",
  questionId: "q1",
  userId: "admin1",
  content: "답변 내용입니다.",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("POST /api/products/[id]/questions/[questionId]/answers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 케이스 ①: admin 정상 → 201 + answer.create 호출 (userId=session.user.id)
  it("① admin 정상 → 201 + answer.create(userId=session.user.id)", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(true);
    // productId 포함 — URL productId("1")와 일치하도록 보강
    questionFindUniqueMock.mockResolvedValue({ id: "q1", productId: "1" });
    answerCreateMock.mockResolvedValue(createdAnswer);

    const res = await POST(
      makePostReq({ content: "답변 내용입니다." }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(answerCreateMock).toHaveBeenCalledOnce();
    expect(answerCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "admin1" }),
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/product/1");
  });

  // 케이스 ②: 비로그인(auth null) → 401
  it("② 비로그인 → 401", async () => {
    authMock.mockResolvedValue(null);

    const res = await POST(
      makePostReq({ content: "답변" }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(answerCreateMock).not.toHaveBeenCalled();
  });

  // 케이스 ③: 비admin 로그인(isAdmin false) → 403
  it("③ 비admin 로그인 → 403", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "user@example.com" } });
    isAdminMock.mockReturnValue(false);

    const res = await POST(
      makePostReq({ content: "답변" }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toBe("관리자만 답변할 수 있습니다.");
    expect(answerCreateMock).not.toHaveBeenCalled();
  });

  // 케이스 ④: admin이지만 공백 content → 400
  // 게이트 순서: admin 통과 → body 파싱 → content 검증(400) → question 조회 X
  it("④ admin + 공백 content → 400", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(true);

    const res = await POST(
      makePostReq({ content: "   " }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    // content 검증이 question.findUnique 전에 실행
    expect(questionFindUniqueMock).not.toHaveBeenCalled();
    expect(answerCreateMock).not.toHaveBeenCalled();
  });

  // 케이스 ⑤: admin + 존재하지 않는 questionId(findUnique→null) → 404
  it("⑤ admin + 없는 questionId → 404", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(true);
    questionFindUniqueMock.mockResolvedValue(null);

    const res = await POST(
      makePostReq({ content: "답변 내용" }),
      { params: makeParams("1", "nonexistent") },
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe("질문을 찾을 수 없습니다.");
    expect(answerCreateMock).not.toHaveBeenCalled();
  });

  // 케이스 ⑥: admin + URL productId와 question.productId 불일치(경로 정합 실패) → 404
  it("⑥ admin + URL productId와 question productId 불일치 → 404", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(true);
    // 질문의 실제 productId("2")와 URL productId("1")가 다름
    questionFindUniqueMock.mockResolvedValue({ id: "q1", productId: "2" });

    const res = await POST(
      makePostReq({ content: "답변 내용" }),
      { params: makeParams("1", "q1") },
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe("질문을 찾을 수 없습니다.");
    expect(answerCreateMock).not.toHaveBeenCalled();
  });
});
