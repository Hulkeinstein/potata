/**
 * 이메일/이름 정규화 — 순수 문자열 유틸 (무거운 의존성 없음).
 *
 * 왜 별도 모듈인가:
 *   `lib/auth.ts`는 `generateVerificationCode`용으로 최상단에서 `node:crypto`를 import한다.
 *   `node:crypto`는 Edge 런타임(middleware)에서 미지원이라, middleware가 정규화 함수를
 *   쓰려고 `lib/auth`를 import하면 `node:crypto`가 Edge 번들에 끌려와 런타임이 깨진다.
 *   순수 정규화 함수만 여기로 분리해 Edge(middleware)에서 안전하게 import한다.
 *   `lib/auth.ts`는 하위호환을 위해 이들을 재노출한다.
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(normalizeEmail(email));
}
