import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileOnboardingForm } from "./ProfileOnboardingForm";

const { replace, refresh } = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
const router = { replace, refresh };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const profile = { success: true, data: { name: "Mina", handle: null, onboardingCompletedAt: null, settings: { preferredSize: null, aiCoordinatorEnabled: true, heightCm: null, weightKg: null } } };
const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("ProfileOnboardingForm", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders a fixed @ adornment outside the stored handle input", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => profile }));
    render(<ProfileOnboardingForm returnTo="/" />);
    const input = await screen.findByLabelText("핸들");
    expect(input.getAttribute("value")).toBe("");
    expect(screen.getByText("@").getAttribute("aria-hidden")).toBe("true");
  });

  it("rejects uppercase feedback without silently converting it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => profile }));
    render(<ProfileOnboardingForm returnTo="/" />);
    const input = await screen.findByLabelText("핸들");
    fireEvent.change(input, { target: { value: "Mina_1" } });
    fireEvent.blur(input);
    expect((await screen.findByRole("status")).textContent).toContain("대문자와 공백은 사용할 수 없습니다");
    expect((input as HTMLInputElement).value).toBe("Mina_1");
  });

  it("checks a valid handle and reports a duplicate", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => url.startsWith("/api/auth/handle/check")
      ? { status: 200, ok: true, json: async () => ({ available: false }) }
      : { status: 200, ok: true, json: async () => profile });
    vi.stubGlobal("fetch", fetchMock);
    render(<ProfileOnboardingForm returnTo="/" />);
    const input = await screen.findByLabelText("핸들");
    fireEvent.change(input, { target: { value: "mina_2026" } });
    fireEvent.blur(input);
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith("/api/auth/handle/check?handle=mina_2026"));
    expect((await screen.findByRole("status")).textContent).toContain("이미 사용 중인 핸들");
  });

  it("shows the current avatar and uploads an explicitly selected replacement", async () => {
    const withAvatar = { success: true, data: { ...profile.data, avatar: "https://google.example/mina.jpg" } };
    const fetchMock = vi.fn().mockResolvedValueOnce({ status: 200, ok: true, json: async () => withAvatar }).mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ success: true, data: { avatar: "https://storage.example/mina.png" } }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<ProfileOnboardingForm returnTo="/" />);
    expect((await screen.findByRole("img", { name: "프로필 사진 미리보기" })).getAttribute("src")).toContain("google.example");
    const input = screen.getByLabelText("프로필 사진 선택");
    fireEvent.change(input, { target: { files: [new File(["img"], "mina.png", { type: "image/png" })] } });
    fireEvent.click(screen.getByRole("button", { name: "사진 업로드" }));
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith("/api/users/me/avatar", expect.objectContaining({ method: "POST" })));
    expect((screen.getByRole("img", { name: "프로필 사진 미리보기" }) as HTMLImageElement).src).toContain("storage.example");
  });

  it("shows a safe upload error when avatar endpoint returns non-JSON", async () => {
    const withAvatar = { success: true, data: { ...profile.data, avatar: "https://google.example/mina.jpg" } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ status: 200, ok: true, json: async () => withAvatar }).mockResolvedValueOnce({ status: 502, ok: false, json: async () => { throw new SyntaxError("html"); } }));
    render(<ProfileOnboardingForm returnTo="/" />);
    await screen.findByRole("img", { name: "프로필 사진 미리보기" });
    fireEvent.change(screen.getByLabelText("프로필 사진 선택"), { target: { files: [new File([pngBytes], "mina.png", { type: "image/png" })] } });
    fireEvent.click(screen.getByRole("button", { name: "사진 업로드" }));
    expect((await screen.findByRole("alert")).textContent).toContain("응답을 확인할 수 없습니다");
  });

  it("opens legal copy in a modal and restores focus after Escape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => profile }));
    render(<ProfileOnboardingForm returnTo="/" />);
    const trigger = await screen.findByRole("button", { name: "이용약관 전문 보기" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Potata Terms of Service" })).toBeTruthy();
    expect(screen.getByText(/Pre-launch status/)).toBeTruthy();
    expect(screen.getByText(/DRAFT · NOT FOR PRODUCTION/)).toBeTruthy();
    expect(screen.getByText(/Arabic authoritative wording/)).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("shows a safe error when profile loading returns non-JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 500, ok: false, json: async () => { throw new SyntaxError("html"); } }));
    render(<ProfileOnboardingForm returnTo="/" />);
    expect((await screen.findByRole("alert")).textContent).toContain("프로필을 불러오지 못했습니다");
  });
});
