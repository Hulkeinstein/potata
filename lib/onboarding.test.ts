import { describe, expect, it } from "vitest";
import { parseOnboardingInput, parseSafeReturnTo } from "./onboarding";

describe("parseSafeReturnTo", () => {
  it("keeps a same-origin application path", () => {
    expect(parseSafeReturnTo("/mypage/posts?tab=ootd")).toBe("/mypage/posts?tab=ootd");
  });

  it.each(["https://evil.example", "//evil.example", "/login", "/onboarding/profile"])(
    "rejects unsafe or looping destination %s",
    (value) => expect(parseSafeReturnTo(value)).toBe("/")
  );
});

describe("parseOnboardingInput", () => {
  const valid = {
    name: "Mina",
    handle: "mina_style",
    preferredSize: "M",
    aiCoordinatorEnabled: false,
    termsVersion: "draft-2026-09-01",
    privacyVersion: "draft-2026-09-01",
    termsAccepted: true,
    privacyAccepted: true,
    marketingAccepted: false,
  };

  it("accepts required profile and separate optional preferences", () => {
    expect(parseOnboardingInput(valid)).toMatchObject({ ok: true });
  });

  it("blocks completion when either required consent is missing", () => {
    expect(parseOnboardingInput({ ...valid, privacyAccepted: false })).toEqual({
      ok: false,
      error: "필수 약관과 개인정보 처리방침에 동의해주세요.",
    });
  });

  it("rejects unknown fields at the boundary", () => {
    expect(parseOnboardingInput({ ...valid, userId: "other" })).toMatchObject({ ok: false });
  });

  it("accepts blank optional fit measurements", () => {
    expect(parseOnboardingInput({ ...valid, heightCm: null, weightKg: null })).toMatchObject({ ok: true });
  });

  it("accepts valid metric fit measurements", () => {
    expect(parseOnboardingInput({ ...valid, heightCm: 170.5, weightKg: 62.3 })).toMatchObject({ ok: true });
  });

  it.each([{ heightCm: 99 }, { heightCm: 251 }, { heightCm: "170" }, { weightKg: 24 }, { weightKg: 301 }, { weightKg: Number.NaN }])("rejects invalid fit measurement $heightCm $weightKg", (patch) => {
    expect(parseOnboardingInput({ ...valid, ...patch })).toMatchObject({ ok: false });
  });
});
