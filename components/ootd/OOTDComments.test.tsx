import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OOTDComments } from "./OOTDComments";

const page = {
  success: true,
  data: {
    items: [{ id: "c1", postId: "p1", content: "멋진 룩이에요", createdAt: "2026-08-21T00:00:00Z", author: { id: "u1", name: "Mina", handle: "mina", avatar: null }, isMine: true }],
    nextCursor: "c1",
  },
};

describe("OOTDComments", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("처음 펼칠 때만 댓글을 불러오고 다시 펼치면 캐시를 사용한다", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(page), { status: 200 }));
    render(<OOTDComments postId="p1" initialCount={1} currentUserId="u1" authStatus="authenticated" onCountChange={vi.fn()} onRequireLogin={vi.fn()} />);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "댓글 1개 펼치기" }));
    expect(await screen.findByText("멋진 룩이에요")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "댓글 접기" }));
    fireEvent.click(screen.getByRole("button", { name: "댓글 1개 펼치기" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("로그아웃 상태에서 작성 시 로그인 안내를 호출한다", () => {
    const onRequireLogin = vi.fn();
    render(<OOTDComments postId="p1" initialCount={0} authStatus="unauthenticated" onCountChange={vi.fn()} onRequireLogin={onRequireLogin} />);
    fireEvent.click(screen.getByRole("button", { name: "댓글 0개 펼치기" }));
    fireEvent.click(screen.getByRole("button", { name: "댓글 작성" }));
    expect(onRequireLogin).toHaveBeenCalledTimes(1);
  });

  it("댓글 작성 성공 시 목록과 개수를 갱신하고 중복 제출을 막는다", async () => {
    const created = { ...page.data.items[0], id: "c2", content: "새 댓글" };
    let resolvePost: ((value: Response) => void) | undefined;
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { items: [], nextCursor: null } }), { status: 200 }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolvePost = resolve; }));
    const onCountChange = vi.fn();
    render(<OOTDComments postId="p1" initialCount={0} currentUserId="u1" authStatus="authenticated" onCountChange={onCountChange} onRequireLogin={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "댓글 0개 펼치기" }));
    await screen.findByText("첫 댓글을 남겨보세요.");
    fireEvent.change(screen.getByLabelText("댓글 내용"), { target: { value: " 새 댓글 " } });
    fireEvent.click(screen.getByRole("button", { name: "댓글 작성" }));
    fireEvent.click(screen.getByRole("button", { name: "댓글 작성 중" }));
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    resolvePost?.(new Response(JSON.stringify({ success: true, data: created }), { status: 201 }));
    expect(await screen.findByText("새 댓글")).toBeTruthy();
    expect(onCountChange).toHaveBeenCalledWith(1);
  });

  it("삭제 실패 시 댓글을 유지하고 성공 후에만 제거한다", async () => {
    vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(page), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, error: "삭제 실패" }), { status: 500 }));
    render(<OOTDComments postId="p1" initialCount={1} currentUserId="u1" authStatus="authenticated" onCountChange={vi.fn()} onRequireLogin={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "댓글 1개 펼치기" }));
    await screen.findByText("멋진 룩이에요");
    fireEvent.click(screen.getByRole("button", { name: "Mina님의 댓글 삭제" }));
    expect(await screen.findByText("삭제 실패")).toBeTruthy();
    expect(screen.getByText("멋진 룩이에요")).toBeTruthy();
  });

  it("이전 댓글을 중복 없이 이어 붙인다", async () => {
    const older = { ...page.data.items[0], id: "c0", content: "이전 댓글", isMine: false };
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(page), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { items: [page.data.items[0], older], nextCursor: null } }), { status: 200 }));
    render(<OOTDComments postId="p1" initialCount={2} authStatus="unauthenticated" onCountChange={vi.fn()} onRequireLogin={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "댓글 2개 펼치기" }));
    await screen.findByText("멋진 룩이에요");
    fireEvent.click(screen.getByRole("button", { name: "이전 댓글 불러오기" }));
    expect(await screen.findByText("이전 댓글")).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText("멋진 룩이에요")).toHaveLength(1));
  });
});
