import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: mock 참조를 vi.mock 호이스팅보다 먼저 초기화
const {
  authMock,
  revalidatePathMock,
  questionFindUniqueMock,
  questionUpdateMock,
  questionDeleteMock,
  isAdminMock,
} = vi.hoisted(() => {
  return {
    authMock: vi.fn(),
    revalidatePathMock: vi.fn(),
    questionFindUniqueMock: vi.fn(),
    questionUpdateMock: vi.fn(),
    questionDeleteMock: vi.fn(),
    isAdminMock: vi.fn(),
  };
});

vi.mock("@/auth", () => ({ auth: authMock }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    question: {
      findUnique: questionFindUniqueMock,
      update: questionUpdateMock,
      delete: questionDeleteMock,
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: vi.fn(),
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

// isAdmin은 동기 함수 → mockReturnValue(not mockResolvedValue)
vi.mock("@/lib/admin", () => ({
  isAdmin: isAdminMock,
}));

import { PATCH, DELETE } from "./route";
import type { NextRequest } from "next/server";

// 공통 params 헬퍼 — Promise.resolve로 Next.js 15 async params 모사
const makeParams = (id = "1", questionId = "q1") =>
  Promise.resolve({ id, questionId });

// PATCH/DELETE용 fake req — JSON body
function makePatchReq(body: Record<string, unknown>, productId = "1", questionId = "q1"): NextRequest {
  return new Request(
    `http://localhost/api/products/${productId}/questions/${questionId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  ) as unknown as NextRequest;
}

function makeDeleteReq(productId = "1", questionId = "q1"): NextRequest {
  return new Request(
    `http://localhost/api/products/${productId}/questions/${questionId}`,
    { method: "DELETE" },
  ) as unknown as NextRequest;
}

// 기존 질문 fixture — productId 포함(경로 정합 검증용)
const makeExisting = (overrides: Record<string, unknown> = {}) => ({
  id: "q1",
  userId: "u1",
  productId: "1",
  ...overrides,
});

// update 결과 fixture
const updateResult = {
  id: "q1",
  userId: "u1",
  productId: "1",
  content: "수정된 질문 내용",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-02T00:00:00Z"),
};

describe("PATCH /api/products/[id]/questions/[questionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAdminMock.mockReturnValue(false);
  });

  it("① 본인(existing.userId===session.userId) → 200 + update 호출", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "user@example.com" } });
    questionFindUniqueMock.mockResolvedValue(makeExisting({ userId: "u1" }));
    questionUpdateMock.mockResolvedValue({ ...updateResult });

    const res = await PATCH(
      makePatchReq({ content: "수정된 질문 내용" }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(questionUpdateMock).toHaveBeenCalledOnce();
    expect(revalidatePathMock).toHaveBeenCalledWith("/product/1");
  });

  it("② 타인(existing.userId!=session.userId) → 403 + update 미호출", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "user@example.com" } });
    isAdminMock.mockReturnValue(false);
    questionFindUniqueMock.mockResolvedValue(makeExisting({ userId: "other" }));

    const res = await PATCH(
      makePatchReq({ content: "수정 시도" }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toBe("본인 질문만 수정할 수 있습니다.");
    expect(questionUpdateMock).not.toHaveBeenCalled();
  });

  it("③ admin이 타인 질문 PATCH → 403 (수정은 본인만)", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", email: "admin@potata.com" } });
    isAdminMock.mockReturnValue(true); // admin이지만
    questionFindUniqueMock.mockResolvedValue(makeExisting({ userId: "other" })); // 타인 질문

    const res = await PATCH(
      makePatchReq({ content: "admin 수정 시도" }),
      { params: makeParams() },
    );
    const json = await res.json();

    // 수정은 본인만 — admin도 타인 질문 수정 불가
    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toBe("본인 질문만 수정할 수 있습니다.");
    expect(questionUpdateMock).not.toHaveBeenCalled();
  });

  it("④ 없는 questionId(findUnique→null) → 404", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "user@example.com" } });
    questionFindUniqueMock.mockResolvedValue(null);

    const res = await PATCH(
      makePatchReq({ content: "수정 내용" }),
      { params: makeParams("1", "nonexistent") },
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe("질문을 찾을 수 없습니다.");
    expect(questionUpdateMock).not.toHaveBeenCalled();
  });

  it("⑤ 공백 content → 400", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "user@example.com" } });
    // content 검증은 DB 조회 전에 발생
    // findUnique 호출 여부와 무관하게 400
    questionFindUniqueMock.mockResolvedValue(makeExisting());

    const res = await PATCH(
      makePatchReq({ content: "   " }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("content는 비어있을 수 없습니다.");
    expect(questionUpdateMock).not.toHaveBeenCalled();
  });

  it("⑥ 비로그인 → 401", async () => {
    authMock.mockResolvedValue(null);

    const res = await PATCH(
      makePatchReq({ content: "수정 시도" }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(questionUpdateMock).not.toHaveBeenCalled();
  });

  it("⑦ URL productId와 질문 productId 불일치(경로 정합 실패) → 404", async () => {
    // 질문의 실제 productId("2")와 URL productId("1")가 다름
    authMock.mockResolvedValue({ user: { id: "u1", email: "user@example.com" } });
    questionFindUniqueMock.mockResolvedValue(makeExisting({ productId: "2" }));

    const res = await PATCH(
      makePatchReq({ content: "수정 내용" }, "1", "q1"),
      { params: makeParams("1", "q1") },
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe("질문을 찾을 수 없습니다.");
    expect(questionUpdateMock).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/products/[id]/questions/[questionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAdminMock.mockReturnValue(false);
  });

  it("① 본인 질문 삭제 → 200 + delete 호출", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "user@example.com" } });
    questionFindUniqueMock.mockResolvedValue(makeExisting({ userId: "u1" }));
    questionDeleteMock.mockResolvedValue(undefined);

    const res = await DELETE(
      makeDeleteReq(),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    // cascade는 schema 레벨 — delete 호출 단언으로 충분 (답변 onDelete:Cascade 자동)
    expect(questionDeleteMock).toHaveBeenCalledOnce();
    expect(questionDeleteMock).toHaveBeenCalledWith({ where: { id: "q1" } });
    expect(revalidatePathMock).toHaveBeenCalledWith("/product/1");
  });

  it("② admin이 타인 질문 DELETE(isAdmin true) → 200", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", email: "admin@potata.com" } });
    isAdminMock.mockReturnValue(true); // admin
    questionFindUniqueMock.mockResolvedValue(makeExisting({ userId: "other" })); // 타인 질문
    questionDeleteMock.mockResolvedValue(undefined);

    const res = await DELETE(
      makeDeleteReq(),
      { params: makeParams() },
    );
    const json = await res.json();

    // admin은 타인 질문도 삭제 가능
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(questionDeleteMock).toHaveBeenCalledOnce();
  });

  it("③ 타인 비admin(isAdmin false) → 403 + delete 미호출", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "user@example.com" } });
    isAdminMock.mockReturnValue(false);
    questionFindUniqueMock.mockResolvedValue(makeExisting({ userId: "other" }));

    const res = await DELETE(
      makeDeleteReq(),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toBe("삭제 권한이 없습니다.");
    expect(questionDeleteMock).not.toHaveBeenCalled();
  });

  it("④ 없는 questionId(findUnique→null) → 404", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "user@example.com" } });
    questionFindUniqueMock.mockResolvedValue(null);

    const res = await DELETE(
      makeDeleteReq("1", "nonexistent"),
      { params: makeParams("1", "nonexistent") },
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe("질문을 찾을 수 없습니다.");
    expect(questionDeleteMock).not.toHaveBeenCalled();
  });

  it("⑤ 비로그인 → 401", async () => {
    authMock.mockResolvedValue(null);

    const res = await DELETE(
      makeDeleteReq(),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(questionDeleteMock).not.toHaveBeenCalled();
  });

  it("⑥ URL productId와 질문 productId 불일치(경로 정합 실패) → 404", async () => {
    // 질문의 실제 productId("2")와 URL productId("1")가 다름
    authMock.mockResolvedValue({ user: { id: "u1", email: "user@example.com" } });
    isAdminMock.mockReturnValue(false);
    questionFindUniqueMock.mockResolvedValue(makeExisting({ productId: "2" }));

    const res = await DELETE(
      makeDeleteReq("1", "q1"),
      { params: makeParams("1", "q1") },
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe("질문을 찾을 수 없습니다.");
    expect(questionDeleteMock).not.toHaveBeenCalled();
  });
});
