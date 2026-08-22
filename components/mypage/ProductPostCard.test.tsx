import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductPostCard } from "./ProductPostCard";

vi.mock("next/image", () => ({ default: () => <span role="img" /> }));
vi.mock("next/link", () => ({ default: ({ children, href }: { readonly children: React.ReactNode; readonly href: string }) => <a href={href}>{children}</a> }));

const review = { type: "review" as const, id: "r1", productId: "p1", productName: "재킷", productImageUrl: null, rating: 4, comment: "좋아요", imageUrls: ["/review.jpg"], createdAt: "2026-08-22T00:00:00Z", updatedAt: "2026-08-22T00:00:00Z" };
const question = { type: "question" as const, id: "q1", productId: "p2", productName: "셔츠", productImageUrl: null, content: "재입고되나요?", answerCount: 1, createdAt: "2026-08-22T00:00:00Z", updatedAt: "2026-08-22T00:00:00Z" };

describe("ProductPostCard", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("리뷰 수정 시 기존 이미지를 유지해 전송한다", async () => {
    const onChange = vi.fn();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true, data: { rating: 4, comment: "아주 좋아요", updatedAt: "2026-08-22T01:00:00Z" } }), { status: 200 }));
    render(<ProductPostCard item={review} onChange={onChange} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.change(screen.getByLabelText("리뷰 내용"), { target: { value: "아주 좋아요" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ comment: "아주 좋아요" })));
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe("POST");
    expect((init?.body as FormData).getAll("keepImageUrls")).toEqual(["/review.jpg"]);
  });

  it("Q&A 수정 성공 시 서버가 정규화한 내용을 반영한다", async () => {
    const onChange = vi.fn();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true, data: { content: "정규화된 질문", updatedAt: "2026-08-22T01:00:00Z" } }), { status: 200 }));
    render(<ProductPostCard item={question} onChange={onChange} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.change(screen.getByLabelText("Q&A 내용"), { target: { value: "  정규화된 질문  " } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ content: "정규화된 질문", updatedAt: "2026-08-22T01:00:00Z" })));
  });

  it("Q&A 삭제 실패 시 카드를 유지하고 오류를 표시한다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 500 }));
    const onDelete = vi.fn();
    render(<ProductPostCard item={question} onChange={vi.fn()} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: "Q&A 삭제" }));

    expect((await screen.findByRole("alert")).textContent).toBe("삭제하지 못했어요.");
    expect(screen.getByText("재입고되나요?")).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it.each([
    ["review", review, "리뷰 삭제"],
    ["question", question, "Q&A 삭제"],
  ] as const)("%s 삭제 성공 시 row를 제거한다", async (_type, target, buttonName) => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    const onDelete = vi.fn();
    render(<ProductPostCard item={target} onChange={vi.fn()} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: buttonName }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(target.id));
  });

  it("리뷰 삭제 확인을 취소하면 요청하지 않는다", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<ProductPostCard item={review} onChange={vi.fn()} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "리뷰 삭제" }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["review", review, "리뷰 내용"],
    ["question", question, "Q&A 내용"],
  ] as const)("%s 수정 실패 시 원래 row를 유지한다", async (_type, target, fieldName) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: false, error: "수정 실패" }), { status: 500 }));
    const onChange = vi.fn();
    render(<ProductPostCard item={target} onChange={onChange} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.change(screen.getByLabelText(fieldName), { target: { value: "실패할 변경" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect((await screen.findByRole("alert")).textContent).toBe("수정 실패");
    expect(onChange).not.toHaveBeenCalled();
  });
});
