import { describe, it, expect } from "vitest";
import { validateHandle, RESERVED_HANDLES } from "@/lib/handle";

// 순수함수라 mock 불필요

describe("validateHandle", () => {
  describe("Happy path — 정규화 포함 유효 입력", () => {
    it("소문자 유효 handle → ok:true, value 그대로", () => {
      const r = validateHandle("style_kim");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe("style_kim");
    });

    it("대문자 포함 → 소문자 정규화 후 ok:true", () => {
      const r = validateHandle("Style_Kim");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe("style_kim");
    });

    it("앞뒤 공백 trim 후 유효 → ok:true", () => {
      const r = validateHandle("  style123  ");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe("style123");
    });

    it("숫자 포함 유효 → ok:true", () => {
      const r = validateHandle("user007");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe("user007");
    });

    it("최소 3자 → ok:true", () => {
      const r = validateHandle("abc");
      expect(r.ok).toBe(true);
    });

    it("최대 20자 → ok:true", () => {
      const r = validateHandle("a".repeat(20));
      expect(r.ok).toBe(true);
    });
  });

  describe("길이 규칙", () => {
    it("2자(너무 짧음) → ok:false", () => {
      const r = validateHandle("ab");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/3~20/);
    });

    it("21자(너무 김) → ok:false", () => {
      const r = validateHandle("a".repeat(21));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/3~20/);
    });

    it("빈 문자열 → ok:false", () => {
      const r = validateHandle("");
      expect(r.ok).toBe(false);
    });
  });

  describe("허용 문자 규칙 ([a-z0-9_]만 허용)", () => {
    it("점(.) 포함 → ok:false", () => {
      const r = validateHandle("style.kim");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/영소문자|밑줄/);
    });

    it("한글 포함 → ok:false", () => {
      const r = validateHandle("스타일");
      expect(r.ok).toBe(false);
    });

    it("하이픈(-) 포함 → ok:false", () => {
      const r = validateHandle("style-kim");
      expect(r.ok).toBe(false);
    });

    it("공백만 입력(trim 후 길이 0) → ok:false", () => {
      const r = validateHandle("   ");
      expect(r.ok).toBe(false);
    });

    it("특수문자 @ 포함 → ok:false", () => {
      const r = validateHandle("user@name");
      expect(r.ok).toBe(false);
    });
  });

  describe("예약어 차단", () => {
    it('"admin" 소문자 → ok:false', () => {
      const r = validateHandle("admin");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/사용할 수 없는/);
    });

    it('"Profile" 대문자 → toLowerCase 정규화 후 예약어 매치 → ok:false', () => {
      const r = validateHandle("Profile");
      expect(r.ok).toBe(false);
    });

    it('"ME" 대문자 → 정규화 후 "me" 예약어 매치 → ok:false', () => {
      const r = validateHandle("ME");
      expect(r.ok).toBe(false);
    });

    it('"ADMIN" 전부 대문자 → 정규화 후 예약어 매치 → ok:false', () => {
      const r = validateHandle("ADMIN");
      expect(r.ok).toBe(false);
    });
  });

  describe("RESERVED_HANDLES Set 단언", () => {
    it("RESERVED_HANDLES에 핵심 예약어들이 포함되어 있다", () => {
      expect(RESERVED_HANDLES.has("admin")).toBe(true);
      expect(RESERVED_HANDLES.has("api")).toBe(true);
      expect(RESERVED_HANDLES.has("profile")).toBe(true);
      expect(RESERVED_HANDLES.has("me")).toBe(true);
      expect(RESERVED_HANDLES.has("settings")).toBe(true);
    });

    it("일반 유저 handle은 RESERVED_HANDLES에 없다", () => {
      expect(RESERVED_HANDLES.has("style_kim")).toBe(false);
      expect(RESERVED_HANDLES.has("user007")).toBe(false);
    });
  });
});
