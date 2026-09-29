import { describe, expect, it } from "vitest";

import { isFreshGoogleAuth, MAX_GOOGLE_AUTH_AGE_MS, readGoogleAuthTime } from "./google-reauth";

function idToken(payload: Record<string, unknown>): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "RS256" })}.${encode(payload)}.signature`;
}

describe("readGoogleAuthTime", () => {
  it("id_token의 auth_time을 읽는다", () => {
    expect(readGoogleAuthTime(idToken({ auth_time: 1_700_000_000, email: "a@b.com" }))).toBe(1_700_000_000);
  });

  it.each([
    ["auth_time이 없는 토큰", idToken({ email: "a@b.com" })],
    ["auth_time이 숫자가 아닌 토큰", idToken({ auth_time: "방금" })],
    ["payload가 깨진 토큰", "header.%%%.signature"],
    ["점이 없는 문자열", "not-a-jwt"],
    ["문자열이 아닌 값", undefined],
  ])("%s는 null", (_label, value) => {
    expect(readGoogleAuthTime(value)).toBeNull();
  });
});

describe("isFreshGoogleAuth", () => {
  const now = 1_700_000_000_000;

  it("방금 인증했으면 true", () => {
    expect(isFreshGoogleAuth(now / 1000, now)).toBe(true);
  });

  it("허용 시간 안이면 true", () => {
    expect(isFreshGoogleAuth((now - MAX_GOOGLE_AUTH_AGE_MS + 1000) / 1000, now)).toBe(true);
  });

  it("오래된 인증은 false — 예전 로그인을 재사용할 수 없다", () => {
    expect(isFreshGoogleAuth((now - MAX_GOOGLE_AUTH_AGE_MS - 1000) / 1000, now)).toBe(false);
  });

  it("미래 시각은 false — 시계를 앞당겨 통과시킬 수 없다", () => {
    expect(isFreshGoogleAuth((now + 60_000) / 1000, now)).toBe(false);
  });

  it.each([undefined, null, Number.NaN])("인증 시각이 없으면 false (%s)", (value) => {
    expect(isFreshGoogleAuth(value, now)).toBe(false);
  });
});
