import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MyPostsClient } from "./MyPostsClient";

const replace = vi.fn();
let queryTab: string | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(queryTab ? `tab=${queryTab}` : ""),
}));
vi.mock("next/image", () => ({ default: ({ alt = "" }: { readonly alt?: string }) => <span role="img" aria-label={alt} /> }));
vi.mock("next/link", () => ({ default: ({ children, href }: { readonly children: React.ReactNode; readonly href: string }) => <a href={href}>{children}</a> }));

const success = (items: readonly object[]) => new Response(JSON.stringify({ success: true, data: { items, nextCursor: null } }), { status: 200 });

describe("MyPostsClient", () => {
  beforeEach(() => {
    queryTab = null;
    replace.mockReset();
    vi.restoreAllMocks();
  });

  it("OOTD 기본 탭과 공개 프로필 CTA를 표시한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(success([]));
    render(<MyPostsClient handle="mira" />);

    expect(screen.getByRole("tab", { name: "OOTD" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("link", { name: "공개 프로필 보기" }).getAttribute("href")).toBe("/profile/mira");
    expect(await screen.findByText("아직 올린 OOTD가 없습니다.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "첫 룩 올리기" }).getAttribute("href")).toBe("/what-to-wear");
  });

  it("탭 전환을 URL에 보존하고 해당 목록을 불러온다", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(success([]));
    render(<MyPostsClient handle={null} />);

    await screen.findByText("아직 올린 OOTD가 없습니다.");
    fireEvent.click(screen.getByRole("tab", { name: "Reviews" }));

    expect(replace).toHaveBeenCalledWith("/mypage/posts?tab=reviews", { scroll: false });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/users/me/posts?type=reviews"));
    expect(screen.getByRole("link", { name: "핸들 설정하기" }).getAttribute("href")).toBe("/onboarding/handle?returnTo=/mypage/posts");
  });

  it("현재 탭을 다시 눌러도 표시 중인 목록을 유지한다", async () => {
    const item = { type: "ootd", id: "o1", caption: "출근 룩", imageUrls: ["/look.jpg"], createdAt: "2026-08-22T00:00:00Z", likeCount: 2, commentCount: 1 };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(success([item]));
    render(<MyPostsClient handle={null} />);

    await screen.findByText("출근 룩");
    fireEvent.click(screen.getByRole("tab", { name: "OOTD" }));

    expect(screen.getByText("출근 룩")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("브라우저 history로 URL 탭이 바뀌면 선택 탭과 목록을 동기화한다", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(success([]));
    const view = render(<MyPostsClient handle={null} />);
    await screen.findByText("아직 올린 OOTD가 없습니다.");

    queryTab = "questions";
    view.rerender(<MyPostsClient handle={null} />);

    await waitFor(() => expect(screen.getByRole("tab", { name: "Q&A" }).getAttribute("aria-selected")).toBe("true"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/users/me/posts?type=questions"));
  });

  it("탭 클릭 뒤 URL 반영이 늦게 와도 이미 불러온 목록을 지우지 않는다", async () => {
    const review = { type: "review", id: "r1", productId: "p1", productName: "재킷", productImageUrl: null, rating: 5, comment: "좋아요", imageUrls: [], createdAt: "2026-08-22T00:00:00Z", updatedAt: "2026-08-22T00:00:00Z" };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((url) => Promise.resolve(String(url).includes("type=reviews") ? success([review]) : success([])));
    const view = render(<MyPostsClient handle={null} />);
    await screen.findByText("아직 올린 OOTD가 없습니다.");

    fireEvent.click(screen.getByRole("tab", { name: "Reviews" }));
    await screen.findByText("좋아요");
    queryTab = "reviews";
    view.rerender(<MyPostsClient handle={null} />);

    expect(screen.getByText("좋아요")).toBeTruthy();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("type=reviews"))).toHaveLength(1);
  });

  it("더 보기 실패를 기존 목록 아래에 표시하고 같은 cursor로 재시도한다", async () => {
    const item = { type: "ootd", id: "o1", caption: "출근 룩", imageUrls: ["/look.jpg"], createdAt: "2026-08-22T00:00:00Z", likeCount: 2, commentCount: 1 };
    const first = new Response(JSON.stringify({ success: true, data: { items: [item], nextCursor: "o1" } }), { status: 200 });
    const failed = new Response(JSON.stringify({ success: false, error: "더 불러오지 못했어요." }), { status: 500 });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(first).mockResolvedValueOnce(failed).mockResolvedValueOnce(success([]));
    render(<MyPostsClient handle={null} />);

    fireEvent.click(await screen.findByRole("button", { name: "더 보기" }));
    expect(await screen.findByText("더 불러오지 못했어요.")).toBeTruthy();
    expect(screen.getByText("출근 룩")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith("/api/users/me/posts?type=ootd&cursor=o1"));
  });

  it("삭제 확인 후 성공하면 OOTD 카드를 제거한다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(success([{ type: "ootd", id: "o1", caption: "출근 룩", imageUrls: ["/look.jpg"], createdAt: "2026-08-22T00:00:00Z", likeCount: 2, commentCount: 1 }]))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
    render(<MyPostsClient handle="mira" />);

    fireEvent.click(await screen.findByRole("button", { name: "OOTD 삭제" }));
    await waitFor(() => expect(screen.queryByText("출근 룩")).toBeNull());
    expect(fetchMock).toHaveBeenLastCalledWith("/api/ootd/o1", { method: "DELETE" });
  });
});
