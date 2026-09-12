import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

const { signInMock } = vi.hoisted(() => ({ signInMock: vi.fn() }));

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
  beforeEach(() => signInMock.mockReset());

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
