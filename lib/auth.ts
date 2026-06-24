import { randomInt } from "node:crypto";

// 순수 정규화 유틸은 lib/normalize로 분리(Edge 런타임 안전) — 하위호환 위해 재노출
export { EMAIL_REGEX, normalizeEmail, normalizeName, isValidEmail } from "./normalize";

export const MIN_PASSWORD_LENGTH = 8;
export const VERIFICATION_CODE_LENGTH = 6;
export const VERIFICATION_EXPIRY_MS = 10 * 60 * 1000;
export const MAX_VERIFICATION_ATTEMPTS = 5;

export function generateVerificationCode(): string {
  return randomInt(100000, 1000000).toString();
}

export function extractErrorMessage(
  error: unknown,
  fallback = "서버 오류가 발생했습니다."
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}
