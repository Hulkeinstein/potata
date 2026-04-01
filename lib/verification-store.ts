/**
 * 인메모리 인증 코드 저장소
 * TODO: 나중에 Redis/DB로 교체
 */

interface VerificationEntry {
  code: string;
  email: string;
  name: string;
  passwordHash: string;
  expiresAt: number;
  attempts: number;
}

// In-memory Map (서버 재시작 시 초기화됨 — 추후 DB로 교체)
const verificationStore = new Map<string, VerificationEntry>();

// 만료된 항목 자동 정리 (5분마다)
setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of verificationStore.entries()) {
    if (entry.expiresAt < now) {
      verificationStore.delete(email);
    }
  }
}, 5 * 60 * 1000);

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function setVerification(email: string, entry: Omit<VerificationEntry, "attempts">): void {
  verificationStore.set(email, { ...entry, attempts: 0 });
}

export function getVerification(email: string): VerificationEntry | undefined {
  return verificationStore.get(email);
}

export function incrementAttempts(email: string): void {
  const entry = verificationStore.get(email);
  if (entry) {
    verificationStore.set(email, { ...entry, attempts: entry.attempts + 1 });
  }
}

export function deleteVerification(email: string): void {
  verificationStore.delete(email);
}

export function isExpired(entry: VerificationEntry): boolean {
  return entry.expiresAt < Date.now();
}

export const EXPIRY_MS = 10 * 60 * 1000; // 10분
export const MAX_ATTEMPTS = 5;
