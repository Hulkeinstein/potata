/**
 * 인메모리 인증 코드 저장소
 * TODO: 나중에 Redis/DB로 교체
 */
import { randomInt } from "node:crypto";

type VerificationStoreGlobal = typeof globalThis & {
  __potataVerificationStore?: Map<string, VerificationEntry>;
  __potataVerificationCleanupStarted?: boolean;
};

export interface VerificationEntry {
  code: string;
  email: string;
  name: string;
  passwordHash: string;
  expiresAt: number;
  attempts: number;
}

const globalForVerification = globalThis as VerificationStoreGlobal;
const verificationStore =
  globalForVerification.__potataVerificationStore ??
  new Map<string, VerificationEntry>();

if (!globalForVerification.__potataVerificationStore) {
  globalForVerification.__potataVerificationStore = verificationStore;
}

if (!globalForVerification.__potataVerificationCleanupStarted) {
  globalForVerification.__potataVerificationCleanupStarted = true;

  // 만료된 항목 자동 정리 (5분마다)
  setInterval(() => {
    const now = Date.now();
    for (const [email, entry] of verificationStore.entries()) {
      if (entry.expiresAt <= now) {
        verificationStore.delete(email);
      }
    }
  }, 5 * 60 * 1000);
}

function normalizeKey(email: string): string {
  return email.trim().toLowerCase();
}

export function generateCode(): string {
  return randomInt(100000, 1000000).toString();
}

export function setVerification(email: string, entry: Omit<VerificationEntry, "attempts">): void {
  verificationStore.set(normalizeKey(email), { ...entry, attempts: 0 });
}

export function getVerification(email: string): VerificationEntry | undefined {
  return verificationStore.get(normalizeKey(email));
}

export function incrementAttempts(email: string): void {
  const normalizedEmail = normalizeKey(email);
  const entry = verificationStore.get(normalizedEmail);
  if (entry) {
    verificationStore.set(normalizedEmail, {
      ...entry,
      attempts: entry.attempts + 1,
    });
  }
}

export function deleteVerification(email: string): void {
  verificationStore.delete(normalizeKey(email));
}

export function isExpired(entry: VerificationEntry): boolean {
  return entry.expiresAt <= Date.now();
}

export const EXPIRY_MS = 10 * 60 * 1000; // 10분
export const MAX_ATTEMPTS = 5;
