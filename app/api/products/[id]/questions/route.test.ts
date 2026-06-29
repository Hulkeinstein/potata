import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: mock 참조를 vi.mock 호이스팅보다 먼저 초기화
const {
  authMock,
  isAdminMock,
  revalidatePathMock,
  questionFindManyMock,
  questionCountMock,
  questionCreateMock,
  productFindUniqueMock,
} = vi.hoisted(() => {
  return {
    authMock: vi.fn(),
    isAdminMock: vi.fn(),
    revalidatePathMock: vi.fn(),
    questionFindManyMock: vi.fn(),
    questionCountMock: vi.fn(),
    questionCreateMock: vi.fn(),
    productFindUniqueMock: vi.fn(),
  };
});

vi.mock("@/auth", () => ({ auth: authMock }));

vi.mock("@/lib/admin", () => ({ isAdmin: isAdminMock }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    question: {
      findMany: questionFindManyMock,
      count: questionCountMock,
      create: questionCreateMock,
    },
    product: {
      findUnique: productFindUniqueMock,
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: vi.fn(),
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

import { GET, POST } from "./route";
import type { NextRequest } from "next/server";

// 공통 params 헬퍼
const makeParams = (id = "1") => Promise.resolve({ id });

// GET용 fake req
function makeGetReq(productId = "1"): NextRequest {
  return new Request(`http://localhost/api/products/${productId}/questions`, {
    method: "GET",
  }) as unknown as NextRequest;
}

// POST용 fake req — JSON body
function makePostReq(body: Record<string, unknown>, productId = "1"): NextRequest {
  return new Request(`http://localhost/api/products/${productId}/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

// GET 응답 시 findMany가 반환하는 row fixture
const makeQuestionRow = (overrides: Record<string, unknown> = {}) => ({
  id: "q1",
  userId: "u1",
  productId: "1",
  content: "배송 기간은 어떻게 되나요?",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  user: { name: "홍길동" },
  answers: [],
  ...overrides,
});

// question.create가 반환하는 fixture
const createResult = {
  id: "q1",
  userId: "u1",
  productId: "1",
  content: "배송 기간은 어떻게 되나요?",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("GET /api/products/[id]/questions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("① 정상 목록 → questions 배열 + questionCount 반환 (userName 평탄화) / 비로그인 → viewerIsAdmin false", async () => {
    // 비로그인: auth null, isAdmin false
    authMock.mockResolvedValue(null);
    isAdminMock.mockReturnValue(false);
    questionFindManyMock.mockResolvedValue([
      makeQuestionRow({ answers: [] }),
    ]);
    questionCountMock.mockResolvedValue(1);

    const res = await GET(makeGetReq(), { params: makeParams() });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.questions).toHaveLength(1);
    expect(json.data.questions[0].userName).toBe("홍길동");
    expect(json.data.questionCount).toBe(1);
    expect(json.data.viewerIsAdmin).toBe(false);
  });

  it("② 빈 목록 → questions:[], questionCount:0 / 비admin 로그인 → viewerIsAdmin false", async () => {
    // 비admin 로그인: auth 세션 있음, isAdmin false
    authMock.mockResolvedValue({ user: { id: "u1", email: "user@example.com" } });
    isAdminMock.mockReturnValue(false);
    questionFindManyMock.mockResolvedValue([]);
    questionCountMock.mockResolvedValue(0);

    const res = await GET(makeGetReq(), { params: makeParams() });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.questions).toEqual([]);
    expect(json.data.questionCount).toBe(0);
    expect(json.data.viewerIsAdmin).toBe(false);
  });

  it("③ 답변 포함 질문 → answers 평탄화 (userName 포함)", async () => {
    authMock.mockResolvedValue(null);
    isAdminMock.mockReturnValue(false);
    questionFindManyMock.mockResolvedValue([
      makeQuestionRow({
        answers: [
          {
            id: "a1",
            questionId: "q1",
            content: "약 3~5일 소요됩니다.",
            createdAt: new Date("2026-01-02T00:00:00Z"),
            updatedAt: new Date("2026-01-02T00:00:00Z"),
            user: { name: "관리자" },
          },
        ],
      }),
    ]);
    questionCountMock.mockResolvedValue(1);

    const res = await GET(makeGetReq(), { params: makeParams() });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.questions[0].answers).toHaveLength(1);
    expect(json.data.questions[0].answers[0].userName).toBe("관리자");
    expect(json.data.questions[0].answers[0].questionId).toBe("q1");
  });

  it("④-a admin 로그인 → viewerIsAdmin true", async () => {
    // admin 세션: auth에 admin 이메일, isAdmin → true
    authMock.mockResolvedValue({ user: { id: "admin1", email: "admin@example.com" } });
    isAdminMock.mockReturnValue(true);
    questionFindManyMock.mockResolvedValue([]);
    questionCountMock.mockResolvedValue(0);

    const res = await GET(makeGetReq(), { params: makeParams() });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.viewerIsAdmin).toBe(true);
  });

  it("④-b 비로그인(auth null) → viewerIsAdmin false", async () => {
    authMock.mockResolvedValue(null);
    isAdminMock.mockReturnValue(false);
    questionFindManyMock.mockResolvedValue([]);
    questionCountMock.mockResolvedValue(0);

    const res = await GET(makeGetReq(), { params: makeParams() });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.viewerIsAdmin).toBe(false);
  });
});

describe("POST /api/products/[id]/questions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("④ 정상 로그인 + 유효 content → 201 + question.create 호출", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "user@example.com" } });
    productFindUniqueMock.mockResolvedValue({ id: "1" });
    questionCreateMock.mockResolvedValue({ ...createResult });

    const res = await POST(
      makePostReq({ content: "배송 기간은 어떻게 되나요?" }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(questionCreateMock).toHaveBeenCalledOnce();
    expect(revalidatePathMock).toHaveBeenCalledWith("/product/1");
  });

  it("⑤ 비로그인(auth null) → 401", async () => {
    authMock.mockResolvedValue(null);

    const res = await POST(
      makePostReq({ content: "배송 기간은?" }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(questionCreateMock).not.toHaveBeenCalled();
  });

  it("⑥ session.user.id 없음 → 401", async () => {
    authMock.mockResolvedValue({ user: { email: "user@example.com" } }); // id 누락

    const res = await POST(
      makePostReq({ content: "배송 기간은?" }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(questionCreateMock).not.toHaveBeenCalled();
  });

  it("⑦ content 공백만('   ') → 400", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "user@example.com" } });

    const res = await POST(
      makePostReq({ content: "   " }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("질문 내용을 입력해 주세요.");
    expect(questionCreateMock).not.toHaveBeenCalled();
  });

  it("⑧ content 2001자 → 400", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "user@example.com" } });

    const res = await POST(
      makePostReq({ content: "a".repeat(2001) }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("질문은 2000자 이하여야 합니다.");
    expect(questionCreateMock).not.toHaveBeenCalled();
  });

  it("⑨ 존재하지 않는 productId(product.findUnique→null) → 400", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "user@example.com" } });
    productFindUniqueMock.mockResolvedValue(null);

    const res = await POST(
      makePostReq({ content: "이 상품 있나요?" }),
      { params: makeParams("nonexistent") },
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("존재하지 않는 상품입니다.");
    expect(questionCreateMock).not.toHaveBeenCalled();
  });

  it("⑩ body에 userId 넣어도 create는 session.user.id 사용", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "user@example.com" } });
    productFindUniqueMock.mockResolvedValue({ id: "1" });
    questionCreateMock.mockResolvedValue({ ...createResult, userId: "u1" });

    const res = await POST(
      // body에 임의 userId를 포함해도 무시되어야 함
      makePostReq({ content: "배송 기간은?", userId: "malicious-id" }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    // create 호출 시 data.userId는 반드시 session.user.id("u1")여야 함
    expect(questionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u1",
        }),
      }),
    );
  });
});
