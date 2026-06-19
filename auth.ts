import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authorizeCredentials, syncOAuthUser } from "@/lib/auth-providers";
import { prisma } from "@/lib/prisma";

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
        await syncOAuthUser({
          email: user.email,
          name: user.name,
          image: user.image,
        });
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "google" && user.email) {
          // 어댑터 미사용이라 OAuth user.id는 Google의 sub다.
          // 주문/마이페이지가 쓰는 DB user.id로 교정한다.
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
          if (dbUser) token.id = dbUser.id;
        } else {
          token.id = user.id; // credentials: authorize가 이미 DB id를 반환
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
