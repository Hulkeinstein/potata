import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotificationsPage from "./page";

vi.mock("next/image", () => ({ default: ({ alt = "", ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => <span role="img" aria-label={alt} data-src={String(props.src ?? "")} /> }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

const notification = { id: "n1", type: "COMMENT", readAt: null, createdAt: "2026-08-21T00:00:00Z", actor: { id: "u2", name: "Jin", handle: "jin", avatar: null }, post: { id: "p1", imageUrl: null, caption: "오늘의 룩" } };

describe("NotificationsPage", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("첫 목록 성공 뒤 읽음 처리를 한 번만 실행한다", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { items: [notification], nextCursor: null, unreadCount: 1 } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { updatedCount: 1 } }), { status: 200 }));
    render(<NotificationsPage />);
    expect(await screen.findByText(/댓글을 남겼습니다/)).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "PATCH" });
    expect(screen.queryByText("읽지 않음")).toBeNull();
  });

  it("읽음 처리 실패 시 읽지 않음 상태와 재시도 버튼을 유지한다", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { items: [notification], nextCursor: null, unreadCount: 1 } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { updatedCount: 1 } }), { status: 200 }));
    render(<NotificationsPage />);
    expect(await screen.findByRole("button", { name: "모두 읽음으로 표시 재시도" })).toBeTruthy();
    expect(screen.getByText("읽지 않음")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "모두 읽음으로 표시 재시도" }));
    await waitFor(() => expect(screen.queryByText("읽지 않음")).toBeNull());
  });

  it("목록 실패 후 재시도할 수 있고 빈 상태를 표시한다", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, error: "오류" }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { items: [], nextCursor: null, unreadCount: 0 } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { updatedCount: 0 } }), { status: 200 }));
    render(<NotificationsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "알림 다시 불러오기" }));
    expect(await screen.findByText("아직 알림이 없습니다.")).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: "PATCH" });
  });
});
