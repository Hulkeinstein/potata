import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

export class AdminReauthRateLimitError extends Error {}

export function resetAdminReauthAttemptsForTests(): void { attempts.clear(); }

export async function verifyAdminReauth(userId: string, password: string): Promise<boolean> {
  const now = Date.now(); const current = attempts.get(userId);
  if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) throw new AdminReauthRateLimitError("관리자 재인증 시도가 제한되었습니다.");
  if (current && current.resetAt <= now) attempts.delete(userId);
  if (!password || password.length > 200) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  const valid = user?.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
  if (valid) attempts.delete(userId);
  else attempts.set(userId, { count: (attempts.get(userId)?.count ?? 0) + 1, resetAt: now + WINDOW_MS });
  return valid;
}
