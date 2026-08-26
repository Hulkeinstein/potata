import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminQuestionsInbox } from "@/components/admin/AdminQuestionsInbox";
import type { AdminQuestionPage } from "@/types/admin-questions";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const page: AdminQuestionPage = {
  items: [{
    id: "question-1",
    content: "M 사이즈 재입고되나요?",
    createdAt: "2026-08-26T08:00:00.000Z",
    updatedAt: "2026-08-26T08:00:00.000Z",
    customerName: "고객",
    product: { id: "product-1", name: "Seoul Jacket", brand: "Potata", imageUrl: "/jacket.jpg", isActive: true },
    answers: [],
  }],
  total: 1,
  page: 1,
  pageSize: 20,
  hasMore: false,
};

describe("AdminQuestionsInbox", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("creates an answer through the existing nested answer endpoint", async () => {
    // Given: an unanswered admin inbox item
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { ...page, items: [] } }), { status: 200 }));
    render(<AdminQuestionsInbox initialData={page} initialStatus="unanswered" initialQuery="" />);

    // When: the operator submits an inline answer
    fireEvent.click(screen.getByRole("button", { name: "답변하기" }));
    fireEvent.change(screen.getByLabelText("Seoul Jacket 답변"), { target: { value: "다음 주 입고 예정입니다." } });
    fireEvent.click(screen.getByRole("button", { name: "답변 등록" }));

    // Then: the existing product-scoped endpoint is used and the list refreshes
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/products/product-1/questions/question-1/answers",
      expect.objectContaining({ method: "POST" }),
    ));
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith("/api/admin/questions?status=unanswered&page=1"));
  });

  it("keeps the selected status and search in the URL-backed request", async () => {
    // Given: an inbox with a prepared search response
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true, data: page }), { status: 200 }));
    render(<AdminQuestionsInbox initialData={page} initialStatus="unanswered" initialQuery="" />);

    // When: the operator searches answered questions
    fireEvent.change(screen.getByLabelText("문의 검색"), { target: { value: "Jacket" } });
    fireEvent.click(screen.getByRole("button", { name: "답변 완료" }));

    // Then: the read request and browser URL keep the same state
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/questions?status=answered&page=1&q=Jacket"));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/questions?status=answered&page=1&q=Jacket"));
  });

  it("shows a retryable safe error when the list request fails", async () => {
    // Given: a failed status-filter request
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 500 }));
    render(<AdminQuestionsInbox initialData={page} initialStatus="unanswered" initialQuery="" />);

    // When: the operator opens the answered filter
    fireEvent.click(screen.getByRole("button", { name: "답변 완료" }));

    // Then: no false success is shown and retry remains available
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "다시 시도" })).not.toBeNull();
  });

  it("edits an existing answer through the nested patch endpoint", async () => {
    // Given: an answered inbox item
    const answeredPage: AdminQuestionPage = {
      ...page,
      items: [{ ...page.items[0], answers: [{ id: "answer-1", content: "기존 답변", createdAt: "2026-08-26T09:00:00.000Z", updatedAt: "2026-08-26T09:00:00.000Z", authorName: "운영자" }] }],
    };
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: answeredPage }), { status: 200 }));
    render(<AdminQuestionsInbox initialData={answeredPage} initialStatus="answered" initialQuery="" />);

    // When: the operator updates the current answer
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.change(screen.getByLabelText("Seoul Jacket 답변 수정"), { target: { value: "수정된 답변" } });
    fireEvent.click(screen.getByRole("button", { name: "수정 완료" }));

    // Then: the existing parent-chain-safe endpoint receives the PATCH
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/products/product-1/questions/question-1/answers/answer-1",
      expect.objectContaining({ method: "PATCH" }),
    ));
  });
});
