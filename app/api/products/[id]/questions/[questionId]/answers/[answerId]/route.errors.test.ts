import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, isAdminMock, answerFindUniqueMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  isAdminMock: vi.fn(),
  answerFindUniqueMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/admin", () => ({ isAdmin: isAdminMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: { answer: { findUnique: answerFindUniqueMock } },
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

import { DELETE, PATCH } from "./route";
import type { NextRequest } from "next/server";

function makePatchReq(): NextRequest {
  return {
    url: "http://localhost/api/products/1/questions/q1/answers/a1",
    json: async () => ({ content: "수정 내용" }),
  } as unknown as NextRequest;
}

function makeDeleteReq(): NextRequest {
  return new Request(
    "http://localhost/api/products/1/questions/q1/answers/a1",
    { method: "DELETE" },
  ) as unknown as NextRequest;
}

const params = Promise.resolve({ id: "1", questionId: "q1", answerId: "a1" });

describe("answer PATCH and DELETE unexpected errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "admin1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("PATCH가 데이터베이스 오류를 안전한 메시지로 변환하고 서버에 기록한다", async () => {
    // Given
    const databaseError = new Error("database password=super-secret failed");
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    answerFindUniqueMock.mockRejectedValue(databaseError);

    // When
    const res = await PATCH(makePatchReq(), { params });
    const json = await res.json();

    // Then
    expect(res.status).toBe(500);
    expect(json).toEqual({ success: false, error: "답변 처리 중 오류가 발생했습니다." });
    expect(JSON.stringify(json)).not.toContain(databaseError.message);
    expect(consoleErrorSpy).toHaveBeenCalledWith("[answers PATCH] error:", databaseError);
  });

  it("DELETE가 데이터베이스 오류를 안전한 메시지로 변환하고 서버에 기록한다", async () => {
    // Given
    const databaseError = new Error("database password=super-secret failed");
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    answerFindUniqueMock.mockRejectedValue(databaseError);

    // When
    const res = await DELETE(makeDeleteReq(), { params });
    const json = await res.json();

    // Then
    expect(res.status).toBe(500);
    expect(json).toEqual({ success: false, error: "답변 처리 중 오류가 발생했습니다." });
    expect(JSON.stringify(json)).not.toContain(databaseError.message);
    expect(consoleErrorSpy).toHaveBeenCalledWith("[answers DELETE] error:", databaseError);
  });
});
