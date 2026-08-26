import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, isAdminMock, listAdminQuestionsMock, parseAdminQuestionQueryMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  isAdminMock: vi.fn(),
  listAdminQuestionsMock: vi.fn(),
  parseAdminQuestionQueryMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/admin", () => ({ isAdmin: isAdminMock }));
vi.mock("@/lib/admin-questions", () => ({
  listAdminQuestions: listAdminQuestionsMock,
  parseAdminQuestionQuery: parseAdminQuestionQueryMock,
}));

import { GET } from "./route";

describe("GET /api/admin/questions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an anonymous caller before parsing or querying", async () => {
    // Given
    authMock.mockResolvedValue(null);
    const request = new Request("http://localhost/api/admin/questions?status=all");

    // When
    const response = await GET(request);

    // Then
    expect(response.status).toBe(401);
    expect(parseAdminQuestionQueryMock).not.toHaveBeenCalled();
    expect(listAdminQuestionsMock).not.toHaveBeenCalled();
  });

  it("rejects a non-admin caller before data access", async () => {
    // Given
    authMock.mockResolvedValue({ user: { email: "customer@example.com" } });
    isAdminMock.mockReturnValue(false);
    const request = new Request("http://localhost/api/admin/questions");

    // When
    const response = await GET(request);

    // Then
    expect(response.status).toBe(403);
    expect(listAdminQuestionsMock).not.toHaveBeenCalled();
  });

  it("returns the sanitized page for an admin", async () => {
    // Given
    authMock.mockResolvedValue({ user: { email: "admin@example.com" } });
    isAdminMock.mockReturnValue(true);
    const query = { status: "unanswered", query: "Jacket", page: 1, pageSize: 20 };
    const page = { items: [], total: 0, page: 1, pageSize: 20, hasMore: false };
    parseAdminQuestionQueryMock.mockReturnValue(query);
    listAdminQuestionsMock.mockResolvedValue(page);
    const request = new Request("http://localhost/api/admin/questions?q=Jacket");

    // When
    const response = await GET(request);

    // Then
    expect(response.status).toBe(200);
    expect(parseAdminQuestionQueryMock).toHaveBeenCalledWith(new URL(request.url).searchParams);
    expect(listAdminQuestionsMock).toHaveBeenCalledWith(query);
    await expect(response.json()).resolves.toEqual({ success: true, data: page });
  });
});
