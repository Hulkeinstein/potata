/**
 * NextAuth provider 보조 로직 (auth.ts 설정에서 분리).
 *
 * 왜 분리하나: auth.ts의 인라인 콜백/authorize는 단위 테스트가 어렵다.
 * P0 인증 경로는 테스트 동반이 필수(CLAUDE.md)이므로, 순수하게 호출 가능한
 * 함수로 추출해 prisma mock으로 검증한다.
 */
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_LIMIT_PER_EMAIL = 10;

export interface AuthorizedUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
}

/**
 * Credentials(이메일+비밀번호) 검증. 실패 시 null.
 * - 미인증(emailVerified=false) 차단
 * - OAuth 전용 유저(passwordHash=null)는 Credentials 로그인 불가
 */
export async function authorizeCredentials(
  email: string | undefined,
  password: string | undefined
): Promise<AuthorizedUser | null> {
  if (!email || !password) return null;

  // 무제한 비밀번호 대입을 막는다. 한도를 넘으면 비밀번호가 맞아도 실패로 돌려보낸다(성공/실패 구분 없음).
  if (!consumeRateLimit(`login:${email}`, LOGIN_LIMIT_PER_EMAIL, LOGIN_WINDOW_MS)) return null;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  if (!user.emailVerified) return null;
  if (!user.passwordHash) return null; // OAuth 전용 유저 — 비밀번호 로그인 불가

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  return { id: user.id, email: user.email, name: user.name, image: user.avatar };
}

export interface OAuthProfile {
  email: string;
  name?: string | null;
  image?: string | null;
}

export type OAuthSyncResult = {
  readonly userId: string;
  readonly created: boolean;
  readonly needsOnboarding: boolean;
};

/**
 * OAuth(Google) 유저를 DB에 멱등 upsert 하고 DB user id 반환.
 * - 동일 이메일의 기존(이메일가입) 유저가 있으면 그 레코드를 그대로 사용 = 자연스러운 계정 연결.
 * - 이미 인증된 유저의 passwordHash는 보존 — 비밀번호 로그인 유지.
 * - 아직 인증되지 않은 유저의 passwordHash는 폐기한다. 누구든 남의 이메일로 가입 요청만 하면
 *   그 비밀번호가 남는데, 여기서 emailVerified=true로 승격되는 순간 그 비밀번호로 로그인이
 *   가능해지기 때문이다(계정 탈취). 인증받지 못한 비밀번호는 신뢰하지 않는다.
 * - Google이 이메일 소유를 검증하므로 emailVerified=true.
 */
export async function syncOAuthUser(profile: OAuthProfile): Promise<OAuthSyncResult> {
  const existing = await prisma.user.findUnique({
    where: { email: profile.email },
    select: { id: true, onboardingCompletedAt: true, name: true, avatar: true, emailVerified: true },
  });
  const user = await prisma.user.upsert({
    where: { email: profile.email },
    update: existing && !existing.emailVerified ? { emailVerified: true, passwordHash: null } : { emailVerified: true },
    create: {
      email: profile.email,
      name: profile.name ?? profile.email,
      avatar: profile.image ?? null,
      emailVerified: true,
    },
    select: { id: true, onboardingCompletedAt: true },
  });
  return { userId: user.id, created: existing === null, needsOnboarding: user.onboardingCompletedAt === null };
}
