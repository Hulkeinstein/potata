import { afterEach, describe, expect, it, vi } from "vitest";
import { isPrelaunchOnboardingUser } from "./prelaunch-access";

afterEach(() => vi.unstubAllEnvs());

describe("prelaunch onboarding access", () => {
  it("allows only the configured existing verified account", () => {
    vi.stubEnv("PRELAUNCH_ONBOARDING_EMAIL", "owner@example.com");
    expect(isPrelaunchOnboardingUser({ email: "owner@example.com", emailVerified: true })).toBe(true);
  });
  it.each([null, { email: "other@example.com", emailVerified: true }, { email: "owner@example.com", emailVerified: false }])("denies missing, different, or unverified account %j", (user) => {
    vi.stubEnv("PRELAUNCH_ONBOARDING_EMAIL", "owner@example.com");
    expect(isPrelaunchOnboardingUser(user)).toBe(false);
  });
  it.each(["", "owner@example.com,other@example.com"])("fails closed for invalid single-email configuration %s", (value) => {
    vi.stubEnv("PRELAUNCH_ONBOARDING_EMAIL", value);
    expect(isPrelaunchOnboardingUser({ email: "owner@example.com", emailVerified: true })).toBe(false);
  });
});
