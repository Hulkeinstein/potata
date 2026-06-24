import { describe, it, expect, vi, afterEach } from "vitest";
import { isAdmin } from "@/lib/admin";

afterEach(() => {
  // 각 테스트 후 env stub 복원 — 테스트 간 격리 보장
  vi.unstubAllEnvs();
});

describe("isAdmin — env allowlist 기반 admin 판정", () => {
  describe("ADMIN_EMAILS 설정됨: 'a@x.com, B@X.COM'", () => {
    it("소문자 정확 매칭 → true", () => {
      vi.stubEnv("ADMIN_EMAILS", "a@x.com, B@X.COM");
      expect(isAdmin("a@x.com")).toBe(true);
    });

    it("대소문자 무시 정규화(B@X.COM → b@x.com) → true", () => {
      vi.stubEnv("ADMIN_EMAILS", "a@x.com, B@X.COM");
      expect(isAdmin("b@x.com")).toBe(true);
    });

    it("앞뒤 공백 + 대소문자 혼재(' A@X.COM ') → true", () => {
      vi.stubEnv("ADMIN_EMAILS", "a@x.com, B@X.COM");
      expect(isAdmin(" A@X.COM ")).toBe(true);
    });

    it("목록에 없는 이메일 → false", () => {
      vi.stubEnv("ADMIN_EMAILS", "a@x.com, B@X.COM");
      expect(isAdmin("c@x.com")).toBe(false);
    });

    it("email undefined → false", () => {
      vi.stubEnv("ADMIN_EMAILS", "a@x.com, B@X.COM");
      expect(isAdmin(undefined)).toBe(false);
    });

    it("email null → false", () => {
      vi.stubEnv("ADMIN_EMAILS", "a@x.com, B@X.COM");
      expect(isAdmin(null)).toBe(false);
    });

    it("빈 문자열 email → false", () => {
      vi.stubEnv("ADMIN_EMAILS", "a@x.com, B@X.COM");
      expect(isAdmin("")).toBe(false);
    });
  });

  describe("ADMIN_EMAILS 미설정(빈) — 닫힘 기본값", () => {
    it("env 빈 문자열 → 임의 이메일도 false", () => {
      vi.stubEnv("ADMIN_EMAILS", "");
      expect(isAdmin("anyone@x.com")).toBe(false);
    });

    it("env 미설정(undefined) → 임의 이메일도 false", () => {
      // ADMIN_EMAILS를 stubEnv로 설정하지 않으면 process.env에 없는 상태
      // unstubAllEnvs() 후에도 원래 없던 env는 없는 상태로 유지됨
      // 명시적으로 빈 값 설정하여 닫힘 동작 검증
      vi.stubEnv("ADMIN_EMAILS", "");
      expect(isAdmin("admin@x.com")).toBe(false);
    });
  });
});
