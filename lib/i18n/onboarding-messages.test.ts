import { expect, it } from "vitest";
import { onboardingErrorKey, onboardingMessages } from "./onboarding-messages";

it("provides matching nonempty message keys for English and Korean", () => {
  // Given / When
  const english = Object.keys(onboardingMessages.en).sort();
  const korean = Object.keys(onboardingMessages.ko).sort();
  // Then
  expect(english).toEqual(korean);
  expect(Object.values(onboardingMessages.en).every(Boolean)).toBe(true);
  expect(Object.values(onboardingMessages.ko).every(Boolean)).toBe(true);
});
it("maps known safe errors and never returns an unknown server message", () => {
  // Given / When / Then
  expect(onboardingErrorKey("계정을 찾을 수 없습니다.", "loadError")).toBe("accountMissing");
  expect(onboardingErrorKey("프로필 이미지는 5MB 이하만 가능합니다.", "uploadError")).toBe("photoLimit");
  expect(onboardingErrorKey("Internal server stack trace", "saveError")).toBe("saveError");
});
