/**
 * Google 재인증(step-up) 신선도 판정 — 순수 함수만 둔다(라우트에서 mock 없이 test 가능).
 *
 * 왜 필요한가: step-up은 "세션이 살아 있는가"가 아니라 "방금 Google에서 본인 확인을 했는가"를
 * 증명해야 한다. 세션 쿠키만 확인하면, 쿠키를 탈취한 사람에게도 추가 관문이 저절로 열린다.
 */

/** step-up proof를 담는 쿠키. httpOnly — 브라우저 script와 주소창에 노출되지 않는다. */
export const STEP_UP_COOKIE = "potata_admin_stepup";

/** proof 유효 시간과 동일하게 유지한다(lib/benefits/admin-step-up.ts의 PROOF_TTL_MS). */
export const STEP_UP_COOKIE_MAX_AGE_SEC = 5 * 60;

/** Google 인증 시점이 이보다 오래됐으면 "방금"으로 인정하지 않는다. */
export const MAX_GOOGLE_AUTH_AGE_MS = 5 * 60 * 1000;

/**
 * id_token(JWT) payload에서 auth_time(초)을 읽는다.
 * 서명 검증은 하지 않는다 — 이 토큰은 NextAuth가 Google token endpoint와 TLS로 직접 교환해 받은 값이고,
 * 우리는 그중 "언제 인증했는가"만 본다(권한 판단은 세션·allowlist가 한다).
 */
export function readGoogleAuthTime(idToken: unknown): number | null {
  if (typeof idToken !== "string") return null;
  const payload = idToken.split(".")[1];
  if (!payload) return null;
  try {
    const decoded: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof decoded !== "object" || decoded === null || !("auth_time" in decoded)) return null;
    const authTime = (decoded as { auth_time: unknown }).auth_time;
    return typeof authTime === "number" && Number.isFinite(authTime) ? authTime : null;
  } catch {
    return null; // 형식이 깨진 토큰은 "확인 불가" = 신선하지 않음으로 처리한다.
  }
}

/** Google 인증 시각(초)이 now 기준으로 허용 범위 안인가. 미래 시각과 누락은 모두 거부한다. */
export function isFreshGoogleAuth(
  authTimeSec: number | null | undefined,
  nowMs: number,
  maxAgeMs: number = MAX_GOOGLE_AUTH_AGE_MS,
): boolean {
  if (typeof authTimeSec !== "number" || !Number.isFinite(authTimeSec)) return false;
  const elapsed = nowMs - authTimeSec * 1000;
  return elapsed >= 0 && elapsed <= maxAgeMs;
}
