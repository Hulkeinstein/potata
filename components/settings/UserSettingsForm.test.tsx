import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserSettingsForm } from "./UserSettingsForm";

describe("UserSettingsForm", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("서버 설정을 표시하고 변경값을 저장한다", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { preferredSize: "M", aiCoordinatorEnabled: true } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { preferredSize: "L", aiCoordinatorEnabled: false } }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<UserSettingsForm />);
    const size = await screen.findByLabelText("선호 사이즈");
    fireEvent.change(size, { target: { value: "L" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "AI Coordinator 표시" }));
    fireEvent.click(screen.getByRole("button", { name: "설정 저장" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("저장했습니다"));
    expect(fetchMock).toHaveBeenLastCalledWith("/api/users/me/settings", expect.objectContaining({ method: "PATCH" }));
  });
});
