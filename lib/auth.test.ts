import { describe, it, expect } from "vitest";
import {
  normalizeEmail,
  normalizeName,
  isValidEmail,
  MIN_PASSWORD_LENGTH,
  VERIFICATION_CODE_LENGTH,
} from "@/lib/auth";

describe("normalizeEmail", () => {
  it("앞뒤 공백을 제거하고 소문자로 변환한다", () => {
    expect(normalizeEmail("  Test@Example.COM ")).toBe("test@example.com");
  });

  it("이미 정규화된 이메일은 그대로 반환한다", () => {
    expect(normalizeEmail("user@example.com")).toBe("user@example.com");
  });
});

describe("normalizeName", () => {
  it("앞뒤 공백을 제거한다", () => {
    expect(normalizeName("  홍길동  ")).toBe("홍길동");
  });

  it("내부 연속 공백을 단일 공백으로 줄인다", () => {
    expect(normalizeName("Hong  Gil  Dong")).toBe("Hong Gil Dong");
  });
});

describe("isValidEmail", () => {
  it("유효한 이메일을 true로 반환한다", () => {
    expect(isValidEmail("a@b.com")).toBe(true);
    expect(isValidEmail("user+tag@example.org")).toBe(true);
  });

  it("유효하지 않은 이메일을 false로 반환한다", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("@no-local.com")).toBe(false);
    expect(isValidEmail("no-domain@")).toBe(false);
  });

  it("공백 포함 대문자 이메일도 정규화 후 검증한다", () => {
    expect(isValidEmail("  TEST@EXAMPLE.COM  ")).toBe(true);
  });
});

describe("상수", () => {
  it("MIN_PASSWORD_LENGTH는 8이다", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
  });

  it("VERIFICATION_CODE_LENGTH는 6이다", () => {
    expect(VERIFICATION_CODE_LENGTH).toBe(6);
  });
});
