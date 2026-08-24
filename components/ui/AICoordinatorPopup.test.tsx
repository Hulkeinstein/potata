import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AICoordinatorPopup } from "./AICoordinatorPopup";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { readonly children: React.ReactNode }) => <>{children}</>,
  motion: { div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div> },
}));

describe("AICoordinatorPopup", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("닫기와 배경 클릭으로 이번 표시만 닫는다", () => {
    const first = render(<AICoordinatorPopup name="Mira" />);
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.queryByText("AI COORDINATOR")).toBeNull();
    first.unmount();

    const second = render(<AICoordinatorPopup name="Mira" />);
    const popup = screen.getByText("AI COORDINATOR").closest("div.fixed");
    expect(popup).not.toBeNull();
    fireEvent.click(popup!);
    expect(screen.queryByText("AI COORDINATOR")).toBeNull();
    second.unmount();
  });

  it("하루 숨김 만료 시각을 저장하고 재마운트에서도 숨긴다", () => {
    const now = 1_800_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    const first = render(<AICoordinatorPopup name="Mira" />);
    fireEvent.click(screen.getByRole("button", { name: "하루동안 보지 않기" }));
    expect(Number(localStorage.getItem("aiCoordinatorHiddenUntil"))).toBe(now + 86_400_000);
    first.unmount();

    render(<AICoordinatorPopup name="Mira" />);
    expect(screen.queryByText("AI COORDINATOR")).toBeNull();
  });

  it("가짜 추천 실행 CTA를 노출하지 않는다", () => {
    render(<AICoordinatorPopup name="Mira" />);
    expect(screen.queryByRole("button", { name: /Save Look|Regenerate/ })).toBeNull();
    expect(screen.getByText(/추천 기능을 준비하고 있습니다/)).toBeTruthy();
  });
});
