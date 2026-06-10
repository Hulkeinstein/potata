import { randomInt } from "node:crypto";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;
export const VERIFICATION_CODE_LENGTH = 6;
export const VERIFICATION_EXPIRY_MS = 10 * 60 * 1000;
export const MAX_VERIFICATION_ATTEMPTS = 5;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(normalizeEmail(email));
}

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
