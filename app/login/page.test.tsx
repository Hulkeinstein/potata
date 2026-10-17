import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

const { signInMock } = vi.hoisted(() => ({ signInMock: vi.fn() }));
const language = vi.hoisted(() => ({ locale: "ko" }));
vi.mock("@/components/providers/LanguageProvider", () => ({ useLanguage: () => language }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("next-auth/react", () => ({
  signIn: signInMock,
  useSession: () => ({ status: "unauthenticated" }),
}));
vi.mock("next/image", () => ({
  default: ({ alt }: { readonly alt: string }) => <span role="img" aria-label={alt} />,
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { readonly children: React.ReactNode; readonly href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { readonly children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe("LoginPage", () => {
  beforeEach(() => { signInMock.mockReset(); language.locale = "ko"; });

  it("translates the login screen when English is selected", () => {
    // Given
    language.locale = "en";
    // When
    render(<LoginPage />);
    // Then
    expect(screen.getByRole("link", { name: "Sign up" }).getAttribute("href")).toBe("/signup");
    expect(screen.getByRole("button", { name: /Continue with Google/ })).toBeTruthy();
  });

  it("preserves credentials and translates existing errors when locale changes", async () => {
    // Given
    signInMock.mockResolvedValue({ error: "CredentialsSignin" });
    const view = render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: "이메일로 로그인" }));
    const emailInput = view.container.querySelector('input[type="email"]');
    const passwordInput = view.container.querySelector('input[type="password"]');
    if (!(emailInput instanceof HTMLInputElement) || !(passwordInput instanceof HTMLInputElement)) throw new Error("Missing credentials inputs");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "keep-this-password" } });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
    await waitFor(() => expect(screen.getByText("이메일 또는 비밀번호가 올바르지 않습니다.")).toBeTruthy());
    // When
    language.locale = "en";
    view.rerender(<LoginPage />);
    // Then
    expect(screen.getByText("The email or password is incorrect.")).toBeTruthy();
    expect(emailInput.value).toBe("test@example.com");
    expect(passwordInput.value).toBe("keep-this-password");
  });

  it("회원가입 링크를 첫 로그인 화면에 표시한다", () => {
    render(<LoginPage />);

    expect(screen.getByRole("link", { name: "회원가입" }).getAttribute("href")).toBe("/signup");
  });

  it("Google 로그인 시 계정 선택 화면을 요청한다", () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: /Google로 계속하기/ }));

    expect(signInMock).toHaveBeenCalledWith(
      "google",
      { callbackUrl: "/onboarding/profile" },
      { prompt: "select_account" },
    );
  });
});
