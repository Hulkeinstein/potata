import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserSettingsForm } from "./UserSettingsForm";

describe("UserSettingsForm", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("서버 설정을 표시하고 변경값을 저장한다", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { preferredSize: "M", aiCoordinatorEnabled: true, heightCm: 170, weightKg: 60 } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { avatar: "https://google.example/me.jpg" } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { preferredSize: "L", aiCoordinatorEnabled: false, heightCm: null, weightKg: null } }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<UserSettingsForm />);
    const size = await screen.findByLabelText("선호 사이즈");
    fireEvent.change(size, { target: { value: "L" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "AI Coordinator 표시" }));
    fireEvent.change(screen.getByLabelText("키 (cm)"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("몸무게 (kg)"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "설정 저장" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("저장했습니다"));
    expect(fetchMock).toHaveBeenLastCalledWith("/api/users/me/settings", expect.objectContaining({ method: "PATCH" }));
    expect(fetchMock.mock.calls[2]?.[1]?.body).toContain('"heightCm":null');
  });

  it("완료 사용자의 현재 프로필 사진 관리 필드를 표시한다", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { preferredSize: null, aiCoordinatorEnabled: true, heightCm: null, weightKg: null } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { avatar: "https://google.example/me.jpg" } }) }));
    render(<UserSettingsForm />);
    expect((await screen.findByRole("img", { name: "프로필 사진 미리보기" })).getAttribute("src")).toContain("google.example");
    expect(screen.getByRole("button", { name: "사진 삭제" })).toBeTruthy();
  });
});
