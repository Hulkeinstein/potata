import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider, useLanguage } from "@/components/providers/LanguageProvider";
import VerifyEmailPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams("email=member@example.com"),
}));
vi.mock("next/image", () => ({ default: () => <span /> }));
function SwitchLanguage() {
  const { setLocale } = useLanguage();
  return <button onClick={() => setLocale("ko")}>한국어</button>;
}
describe("email verification view", () => {
  it("renders six code fields and disables verification until complete", () => {
    // Given / When
    render(<LanguageProvider initialLocale="en"><VerifyEmailPage /></LanguageProvider>);
    // Then
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Verify" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("me***@example.com")).toBeTruthy();
  });
  it("preserves code input when changing locale", () => {
    // Given
    render(<LanguageProvider initialLocale="en"><VerifyEmailPage /><SwitchLanguage /></LanguageProvider>);
    fireEvent.change(screen.getByRole("textbox", { name: "Verification code digit 1" }), { target: { value: "7" } });
    // When
    fireEvent.click(screen.getByRole("button", { name: "한국어" }));
    // Then
    expect(screen.getByRole("textbox", { name: "인증 코드 1번째 숫자" }).getAttribute("value")).toBe("7");
    expect(screen.getByRole("button", { name: "인증하기" })).toBeTruthy();
  });
});
