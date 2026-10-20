import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminError from "./error";

describe("admin read error boundary", () => {
  it("offers retry without leaking internal error details or displaying healthy zero", () => {
    // Given: a failed read with private diagnostic text
    const reset = vi.fn();
    render(<AdminError error={new Error("private database host and password")} reset={reset} />);
    // When: the operator retries
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    // Then: retry runs while the message stays generic
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert").textContent).not.toContain("private database");
    expect(screen.queryByText("현재 확인이 필요한 운영 이슈가 없습니다.")).toBeNull();
  });
});
