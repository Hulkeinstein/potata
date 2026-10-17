import type { NextAuthConfig } from "next-auth";
import { describe, expect, it, vi } from "vitest";

// auth.ts 의 Credentials 배선만 검사한다 — NextAuth 설정을 가로채 우리 authorize 를 직접 부른다(auth-prelaunch.test.ts 와 같은 방식).
const { captured, authorizeCredentials } = vi.hoisted(() => ({
  captured: new Map<string, NextAuthConfig>(),
  authorizeCredentials: vi.fn(async () => null),
}));
vi.mock("next-auth", () => ({ default: (config: NextAuthConfig) => { captured.set("auth", config); return {}; } }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/auth-providers", () => ({ authorizeCredentials, syncOAuthUser: vi.fn() }));
import "@/auth";

type CredentialsOptions = { authorize: (credentials: Record<string, unknown>, request: Request) => Promise<unknown> };

describe("auth.ts Credentials 배선", () => {
  it("로그인 요청의 발신지 IP(x-forwarded-for 첫 값)를 authorizeCredentials 에 넘긴다", async () => {
    const providers = captured.get("auth")?.providers ?? [];
    const credentials = providers.find((provider) => typeof provider === "object" && "id" in provider && provider.id === "credentials") as
      | { options: CredentialsOptions }
      | undefined;
    expect(credentials).toBeDefined();

    const request = new Request("http://localhost/api/auth/callback/credentials", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" },
    });
    await credentials!.options.authorize({ email: "a@b.com", password: "pw" }, request);

    expect(authorizeCredentials).toHaveBeenCalledWith("a@b.com", "pw", "203.0.113.9");
  });
});
