import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider, useLanguage } from "@/components/providers/LanguageProvider";
import { EmailSignupForm } from "./EmailSignupForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
function SwitchLanguage() {
  const { setLocale } = useLanguage();
  return <button onClick={() => setLocale("en")}>English</button>;
}
describe("EmailSignupForm language", () => {
  it("keeps inputs and localizes a password mismatch when language changes", () => {
    // Given
    render(<LanguageProvider initialLocale="ko"><EmailSignupForm onClose={vi.fn()} /><SwitchLanguage /></LanguageProvider>);
    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("비밀번호 확인"), { target: { value: "different123" } });
    fireEvent.click(screen.getByRole("button", { name: "다음 — 이메일 인증" }));
    expect(screen.getByRole("alert").textContent).toBe("비밀번호가 일치하지 않습니다.");
    // When
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    // Then
    expect(screen.getByRole("alert").textContent).toBe("Passwords do not match.");
    expect(screen.getByLabelText("Email").getAttribute("value")).toBe("user@example.com");
    expect(screen.getByLabelText("Password").getAttribute("value")).toBe("password123");
    expect(screen.getByLabelText("Confirm password").getAttribute("value")).toBe("different123");
  });
});
