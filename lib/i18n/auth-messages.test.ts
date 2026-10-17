import { describe, expect, it } from "vitest";
import { authMessages, authErrorKey } from "./auth-messages";

describe("auth translations", () => {
  it("has equal nonempty keys in both locales", () => {
    // Given / When
    const keys = Object.keys(authMessages.en);
    // Then
    expect(Object.keys(authMessages.ko)).toEqual(keys);
    expect(Object.values(authMessages.en).every(Boolean)).toBe(true);
    expect(Object.values(authMessages.ko).every(Boolean)).toBe(true);
  });
  it("maps approved errors and conceals unknown provider details", () => {
    // Given
    const unknown = "Provider secret detail";
    // When / Then
    expect(authErrorKey("이미 가입된 이메일입니다. 로그인해주세요.", "signupFailed")).toBe("emailTaken");
    expect(authErrorKey(unknown, "signupFailed")).toBe("signupFailed");
  });
});
