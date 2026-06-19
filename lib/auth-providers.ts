/**
 * NextAuth provider 보조 로직 (auth.ts 설정에서 분리).
 *
 * 왜 분리하나: auth.ts의 인라인 콜백/authorize는 단위 테스트가 어렵다.
 * P0 인증 경로는 테스트 동반이 필수(CLAUDE.md)이므로, 순수하게 호출 가능한
 * 함수로 추출해 prisma mock으로 검증한다.
 */
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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

/**
 * OAuth(Google) 유저를 DB에 멱등 upsert 하고 DB user id 반환.
 * - 동일 이메일의 기존(이메일가입) 유저가 있으면 그 레코드를 그대로 사용 = 자연스러운 계정 연결.
 * - 기존 유저의 passwordHash는 보존(update 절에 포함하지 않음) — 비밀번호 로그인 유지.
 * - Google이 이메일 소유를 검증하므로 emailVerified=true.
 */
export async function syncOAuthUser(profile: OAuthProfile): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email: profile.email },
    update: {
      name: profile.name ?? undefined,
      avatar: profile.image ?? undefined,
      emailVerified: true,
    },
    create: {
      email: profile.email,
      name: profile.name ?? profile.email,
      avatar: profile.image ?? null,
      emailVerified: true,
    },
  });
  return user.id;
}
