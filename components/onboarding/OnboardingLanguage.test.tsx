import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ProfileOnboardingForm } from "./ProfileOnboardingForm";

const state = vi.hoisted(() => ({ locale: "en" }));
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("@/components/providers/LanguageProvider", () => ({ useLanguage: () => state }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ update: vi.fn() }) }));
beforeEach(() => {
  state.locale = "en";
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => ({ success: true, data: { name: "Mina", avatar: null, handle: null, onboardingCompletedAt: null, settings: { preferredSize: null, aiCoordinatorEnabled: true, heightCm: null, weightKg: null } } }) }));
});
it("preserves unsaved profile and consent when language changes", async () => {
  // Given
  const view = render(<ProfileOnboardingForm returnTo="/" />);
  const name = await screen.findByLabelText("Display name");
  fireEvent.change(name, { target: { value: "My chosen name" } });
  fireEvent.change(screen.getByLabelText("Handle"), { target: { value: "mina_2026" } });
  fireEvent.click(screen.getByLabelText("Terms of Service (required)"));
  // When
  state.locale = "ko";
  view.rerender(<ProfileOnboardingForm returnTo="/" />);
  // Then
  expect(screen.getByLabelText("표시 이름")).toHaveProperty("value", "My chosen name");
  expect(screen.getByLabelText("핸들")).toHaveProperty("value", "mina_2026");
  expect(screen.getByLabelText("이용약관 동의 (필수)")).toHaveProperty("checked", true);
});
it("translates an existing safe fallback without exposing an unknown server error", async () => {
  // Given
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 500, ok: false, json: async () => ({ success: false, error: "Prisma server secret" }) }));
  const view = render(<ProfileOnboardingForm returnTo="/" />);
  expect((await screen.findByRole("alert")).textContent).toBe("Could not load your profile.");
  // When
  state.locale = "ko";
  view.rerender(<ProfileOnboardingForm returnTo="/" />);
  // Then
  expect(screen.getByRole("alert").textContent).toBe("프로필을 불러오지 못했습니다.");
  expect(screen.queryByText("Prisma server secret")).toBeNull();
});
it("keeps the original legal body and version in a translated modal", async () => {
  // Given
  const view = render(<ProfileOnboardingForm returnTo="/" />);
  fireEvent.click(await screen.findByRole("button", { name: "Terms of Service (required) — read full text" }));
  expect(screen.getByText(/Original legal draft below/)).toBeTruthy();
  // When
  state.locale = "ko";
  view.rerender(<ProfileOnboardingForm returnTo="/" />);
  // Then
  expect(screen.getByRole("dialog", { name: "Potata Terms of Service" })).toBeTruthy();
  expect(screen.getByText(/Pre-launch status/)).toBeTruthy();
  expect(screen.getByText(/DRAFT · NOT FOR PRODUCTION/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "약관 닫기" })).toBeTruthy();
});
it("localizes existing handle feedback without changing the validator", async () => {
  // Given
  const view = render(<ProfileOnboardingForm returnTo="/" />);
  const handle = await screen.findByLabelText("Handle");
  fireEvent.change(handle, { target: { value: "UPPER" } });
  fireEvent.blur(handle);
  expect(screen.getByRole("status").textContent).toContain("Uppercase");
  // When
  state.locale = "ko";
  view.rerender(<ProfileOnboardingForm returnTo="/" />);
  // Then
  expect(screen.getByRole("status").textContent).toContain("대문자와 공백");
});
