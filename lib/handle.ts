/**
 * handle 형식 검증 — 순수 문자열 유틸 (DB 호출 없음).
 *
 * 왜 별도 모듈인가:
 *   handle 검증은 가입(signup API), 온보딩 폼, 중복체크 API, 미들웨어 등
 *   여러 레이어에서 재사용된다. DB unique 체크는 호출측 책임이며,
 *   이 모듈은 형식·예약어만 순수하게 검증해 어디서든 안전하게 import할 수 있다.
 */

/**
 * 실제 app/ 1뎁스 라우트명 + 안전어 예약 목록.
 * 새 라우트 추가 시 함께 갱신할 것.
 */
export const RESERVED_HANDLES = new Set<string>([
  // 실제 app/ 1뎁스 라우트 (충돌 방지)
  "admin",
  "api",
  "brands",
  "category",
  "checkout",
  "for-you",
  "liked",
  "login",
  "mypage",
  "product",
  "ranking",
  "search",
  "shop",
  "signup",
  "try-on",
  "verify-email",
  "what-to-wear",
  // 안전어 (미래 라우트 예약 / 브랜드 보호)
  "me",
  "settings",
  "about",
  "help",
  "terms",
  "privacy",
  "support",
  "explore",
  "onboarding",
  "profile",
]);

/**
 * handle 검증 순수함수.
 *
 * 규칙:
 *   1. 소문자 정규화 (trim + toLowerCase) → Admin → admin
 *   2. 허용 문자: [a-z0-9_] (영소문자·숫자·밑줄)
 *   3. 길이: 3~20자
 *   4. 예약어(RESERVED_HANDLES) 차단
 *   5. DB unique 체크는 호출측 책임 (이 함수는 DB 미접촉)
 *
 * @param raw - 사용자 입력 원본 문자열
 * @returns ok:true → 정규화된 handle 값 / ok:false → 에러 메시지
 */
export function validateHandle(
  raw: string
): { ok: true; value: string } | { ok: false; error: string } {
  // 소문자 정규화 — Admin/ADMIN 도 예약어 매치
  const value = String(raw ?? "").trim().toLowerCase();

  if (value.length < 3 || value.length > 20) {
    return { ok: false, error: "핸들은 3~20자여야 합니다." };
  }

  // ReDoS 안전한 단순 char-class 정규식
  if (!/^[a-z0-9_]+$/.test(value)) {
    return { ok: false, error: "영소문자·숫자·밑줄(_)만 사용할 수 있습니다." };
  }

  if (RESERVED_HANDLES.has(value)) {
    return { ok: false, error: "사용할 수 없는 핸들입니다." };
  }

  return { ok: true, value };
}
