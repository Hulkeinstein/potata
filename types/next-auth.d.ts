import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
    };
    /** 마지막 Google 인증 시각(초). 관리자 step-up의 "방금 인증했는가" 판정에 쓴다. */
    googleAuthTime?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    googleAuthTime?: number;
  }
}
