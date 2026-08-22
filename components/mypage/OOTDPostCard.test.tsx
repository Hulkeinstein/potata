import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OOTDPostCard } from "./OOTDPostCard";

vi.mock("next/image", () => ({ default: () => <span role="img" /> }));

const item = { type: "ootd" as const, id: "o1", caption: "기존 룩", imageUrls: ["/look.jpg"], createdAt: "2026-08-22T00:00:00Z", likeCount: 2, commentCount: 1 };

describe("OOTDPostCard", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("caption 수정 성공 시 서버 정규화 결과를 반영하고 중복 저장을 막는다", async () => {
    let finish: ((response: Response) => void) | undefined;
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const onChange = vi.fn();
    render(<OOTDPostCard item={item} onChange={onChange} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.change(screen.getByLabelText("OOTD 설명"), { target: { value: "  새 룩  " } });
    const save = screen.getByRole("button", { name: "저장" });
    fireEvent.click(save);
    expect(save.hasAttribute("disabled")).toBe(true);
    finish?.(new Response(JSON.stringify({ success: true, data: { caption: "새 룩" } }), { status: 200 }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ caption: "새 룩" })));
  });

  it("수정 실패 시 카드를 유지하고 취소하면 원래 caption을 복원한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: false, error: "수정 실패" }), { status: 500 }));
    render(<OOTDPostCard item={item} onChange={vi.fn()} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.change(screen.getByLabelText("OOTD 설명"), { target: { value: "취소할 값" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect((await screen.findByRole("alert")).textContent).toBe("수정 실패");
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.getByText("기존 룩")).toBeTruthy();
  });

  it("삭제 확인을 취소하면 요청과 row 제거를 하지 않는다", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const onDelete = vi.fn();
    render(<OOTDPostCard item={item} onChange={vi.fn()} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: "OOTD 삭제" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
