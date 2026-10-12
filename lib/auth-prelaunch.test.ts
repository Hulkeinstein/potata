import type { NextAuthConfig } from "next-auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { captured, findUser, sync } = vi.hoisted(() => ({
  captured: new Map<string, NextAuthConfig>(), findUser: vi.fn(), sync: vi.fn(),
}));
vi.mock("next-auth", () => ({ default: (config: NextAuthConfig) => { captured.set("auth", config); return {}; } }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: findUser } } }));
vi.mock("@/lib/auth-providers", () => ({ authorizeCredentials: vi.fn(), syncOAuthUser: sync }));
import "@/auth";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("LEGAL_DOCS_PRODUCTION_READY", "false");
  vi.stubEnv("PRELAUNCH_ONBOARDING_EMAIL", "owner@example.com");
  findUser.mockResolvedValue({ email: "owner@example.com", emailVerified: true, onboardingCompletedAt: null });
});
afterEach(() => vi.unstubAllEnvs());

async function attempt(email = "owner@example.com", verified = true) {
  const callback = captured.get("auth")?.callbacks?.signIn;
  if (!callback) throw new Error("Missing signIn callback");
  return callback({ user: { id: "google-id", email }, account: { provider: "google", type: "oauth", providerAccountId: "google-id" }, profile: { email, email_verified: verified } });
}

describe("Google prelaunch account exception", () => {
  it("allows the existing configured verified account", async () => {
    expect(await attempt()).toBe(true);
    expect(sync).toHaveBeenCalledOnce();
  });
  it("rejects an unverified Google email", async () => {
    expect(await attempt("owner@example.com", false)).toBe(false);
    expect(sync).not.toHaveBeenCalled();
  });
  it("rejects an account absent from the database", async () => {
    findUser.mockResolvedValue(null);
    expect(await attempt()).toBe(false);
    expect(sync).not.toHaveBeenCalled();
  });
  it("rejects a different incomplete account", async () => {
    findUser.mockResolvedValue({ email: "other@example.com", emailVerified: true, onboardingCompletedAt: null });
    expect(await attempt("other@example.com")).toBe(false);
  });
  it("preserves access for existing completed accounts", async () => {
    findUser.mockResolvedValue({ email: "other@example.com", emailVerified: true, onboardingCompletedAt: new Date() });
    expect(await attempt("other@example.com")).toBe(true);
  });
});
