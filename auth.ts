import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authorizeCredentials, syncOAuthUser } from "@/lib/auth-providers";
import { prisma } from "@/lib/prisma";
import { isLegalSignupReady } from "@/lib/onboarding";
import { readGoogleAuthTime } from "@/lib/benefits/google-reauth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: (credentials) =>
        authorizeCredentials(
          credentials?.email as string | undefined,
          credentials?.password as string | undefined
        ),
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Google 로그인: DB에 유저를 멱등 동기화(없으면 생성, 있으면 갱신).
    // 동일 이메일의 기존 이메일가입 유저가 있으면 그 레코드로 자연 연결됨.
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        if (!isLegalSignupReady()) {
          const existing = await prisma.user.findUnique({
            where: { email: user.email },
            select: { onboardingCompletedAt: true },
          });
          if (!existing?.onboardingCompletedAt) return false;
        }
        await syncOAuthUser({
          email: user.email,
          name: user.name,
          image: user.image,
        });
      }
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      if (account?.provider === "google") {
        // 관리자 step-up이 "방금 Google에서 본인 확인을 했는가"를 판정할 근거.
        // auth_time은 재로그인을 강제할 때(max_age=0) Google이 넣어준다. 없으면 이번 로그인 시각을 쓴다
        // — 어느 쪽이든 Google 계정을 실제로 통과해야만 갱신되므로, 세션 쿠키만으로는 만들 수 없다.
        token.googleAuthTime =
          readGoogleAuthTime(account.id_token) ?? Math.floor(Date.now() / 1000);
      }
      if (user) {
        if (account?.provider === "google" && user.email) {
          // 어댑터 미사용이라 OAuth user.id는 Google의 sub다.
          // 주문/마이페이지가 쓰는 DB user.id로 교정한다.
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, name: true, avatar: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.name = dbUser.name;
            token.picture = dbUser.avatar;
          }
        } else {
          token.id = user.id; // credentials: authorize가 이미 DB id를 반환
        }
      }
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { name: true, avatar: true },
        });
        if (dbUser) {
          token.name = dbUser.name;
          token.picture = dbUser.avatar;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.image = token.picture;
      }
      session.googleAuthTime = typeof token.googleAuthTime === "number" ? token.googleAuthTime : undefined;
      return session;
    },
  },
});
