import { describe, expect, it, vi } from "vitest";

const { questionFindManyMock, questionCountMock, transactionMock } = vi.hoisted(() => ({
  questionFindManyMock: vi.fn(),
  questionCountMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
    question: {
      findMany: questionFindManyMock,
      count: questionCountMock,
    },
  },
}));

import { listAdminQuestions, parseAdminQuestionQuery } from "@/lib/admin-questions";

describe("parseAdminQuestionQuery", () => {
  it("defaults malformed input to unanswered and bounded pagination", () => {
    // Given
    const params = new URLSearchParams("status=unsafe&page=-3&pageSize=999&q=" + "x".repeat(101));

    // When
    const query = parseAdminQuestionQuery(params);

    // Then
    expect(query).toEqual({ status: "unanswered", query: "x".repeat(100), page: 1, pageSize: 50 });
  });

  it("clamps a huge page value to the maximum page", () => {
    // Given
    const params = new URLSearchParams("page=999999999");

    // When
    const query = parseAdminQuestionQuery(params);

    // Then
    expect(query.page).toBe(100);
  });
});

describe("listAdminQuestions", () => {
  it("returns a sanitized answered page without customer email", async () => {
    // Given
    const createdAt = new Date("2026-08-26T00:00:00.000Z");
    questionFindManyMock.mockReturnValue("rows-query");
    questionCountMock.mockReturnValue("count-query");
    transactionMock.mockResolvedValue([
      [{
        id: "question-1",
        content: "Does it fit true to size?",
        createdAt,
        updatedAt: createdAt,
        user: { name: "Customer", email: "private@example.com" },
        product: { id: "product-1", name: "Jacket", brand: "Potata", imageUrl: "https://example.com/jacket.jpg", isActive: false },
        answers: [{ id: "answer-1", content: "Yes.", createdAt, updatedAt: createdAt, user: { name: "Admin", email: "admin@example.com" } }],
      }],
      1,
    ]);

    // When
    const page = await listAdminQuestions({ status: "answered", query: "", page: 1, pageSize: 20 });

    // Then
    expect(page).toEqual({
      items: [{
        id: "question-1",
        content: "Does it fit true to size?",
        createdAt: "2026-08-26T00:00:00.000Z",
        updatedAt: "2026-08-26T00:00:00.000Z",
        customerName: "Customer",
        product: { id: "product-1", name: "Jacket", brand: "Potata", imageUrl: "https://example.com/jacket.jpg", isActive: false },
        answers: [{ id: "answer-1", content: "Yes.", createdAt: "2026-08-26T00:00:00.000Z", updatedAt: "2026-08-26T00:00:00.000Z", authorName: "Admin" }],
      }],
      total: 1,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
    expect(JSON.stringify(page)).not.toContain("private@example.com");
    expect(questionFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { answers: { some: {} } },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20,
    }));
  });
});
