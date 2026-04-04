# Work Plan: Supabase + Prisma + NextAuth v5 풀스택 인증 세팅

## Overview

- **Objective**: 인메모리 verification-store를 Prisma/Supabase DB로 교체하고, NextAuth v5 서버사이드 세션을 구현하여 프로덕션 레디 인증 시스템 완성
- **Branch**: `feat/supabase-prisma-nextauth-setup`
- **Scope**:
  - **IN**: Prisma 설정, DB 마이그레이션, verification-store 재작성, API 라우트 수정, NextAuth v5 설정, 로그인 API, AuthProvider, middleware, auth-store 수정
  - **OUT**: 소셜 로그인 (Google/Kakao), 비밀번호 재설정, 마이페이지/주문/즐겨찾기 UI, 이메일 도메인 인증
- **Tech Stack**: Next.js 16 + React 19, Supabase PostgreSQL, Prisma ORM, NextAuth v5 (Auth.js), bcryptjs, Vercel 배포

## 환경변수 목록

`.env.local`에 추가할 변수들:

| 변수명 | 설명 | 획득 방법 |
|--------|------|----------|
| `DATABASE_URL` | Supabase pooler 연결 (port 6543) | Supabase Dashboard > Settings > Database > Connection string (Transaction mode) |
| `DIRECT_URL` | Supabase 직접 연결 (port 5432) | Supabase Dashboard > Settings > Database > Connection string (Session mode) |
| `NEXTAUTH_URL` | 앱 URL | 로컬: `http://localhost:3000`, 프로덕션: Vercel 도메인 |
| `NEXTAUTH_SECRET` | JWT 서명 시크릿 | `openssl rand -base64 32` 로 생성 |
| `RESEND_API_KEY` | (기존) 이메일 발송 | 이미 설정됨 |

## Prerequisites

- [ ] Supabase 프로젝트 생성 완료
- [ ] DATABASE_URL, DIRECT_URL 확보
- [ ] NEXTAUTH_SECRET 생성

---

## TODOs

### Phase 1: 패키지 설치 `category:quick`

- [ ] 패키지 설치 및 postinstall 스크립트 추가

**명령어:**
```bash
npm install @prisma/client next-auth@beta bcryptjs
npm install -D prisma @types/bcryptjs
```

**파일: `package.json`** (변경 사항만 표시)
```jsonc
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    // 기존 항목 유지 + 추가:
    "@prisma/client": "^6.x",
    "bcryptjs": "^2.4.3",
    "next-auth": "^5.0.0-beta.x"
    // ... 나머지 기존 의존성 유지
  },
  "devDependencies": {
    // 기존 항목 유지 + 추가:
    "@types/bcryptjs": "^2.4.x",
    "prisma": "^6.x"
    // ... 나머지 기존 devDependencies 유지
  }
}
```

> NOTE: `next-auth@beta`는 v5 (Auth.js). 정확한 버전은 설치 시점 최신 beta 사용.

---

### Phase 2: Prisma 설정 `category:quick`

- [ ] `prisma/schema.prisma` 생성
- [ ] `lib/prisma.ts` 생성
- [ ] `npx prisma db push` 실행
- [ ] `.env.example` 업데이트

**파일: `prisma/schema.prisma`** (신규)
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  passwordHash  String
  emailVerified Boolean  @default(false)
  avatar        String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([email])
}

model VerificationCode {
  id           String   @id @default(cuid())
  email        String
  name         String
  passwordHash String
  code         String
  expiresAt    DateTime
  attempts     Int      @default(0)
  createdAt    DateTime @default(now())

  @@index([email])
  @@index([expiresAt])
}
```

**파일: `lib/prisma.ts`** (신규)
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

**파일: `.env.example`** (수정 -- 전체 파일)
```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Feature Flags
NEXT_PUBLIC_ENABLE_AI_TRYON=true

# Analytics (Optional)
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_VERCEL_ANALYTICS=false

# Resend (Email)
RESEND_API_KEY=

# Supabase PostgreSQL
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# NextAuth v5
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
```

**실행할 명령어:**
```bash
npx prisma db push
npx prisma generate
```

---

### Phase 3: verification-store.ts 재작성 `category:ultrabrain`

- [ ] `lib/verification-store.ts`를 Prisma async DB 기반으로 전면 재작성

**파일: `lib/verification-store.ts`** (전체 재작성)
```typescript
/**
 * Prisma DB 기반 인증 코드 저장소
 * 인메모리 Map → Supabase PostgreSQL
 */

import { prisma } from "@/lib/prisma";

export const EXPIRY_MS = 10 * 60 * 1000; // 10분
export const MAX_ATTEMPTS = 5;

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

interface SetVerificationParams {
  code: string;
  email: string;
  name: string;
  passwordHash: string;
  expiresAt: number;
}

/**
 * 인증 코드 저장 (upsert: 동일 email 기존 레코드 삭제 후 생성)
 */
export async function setVerification(
  email: string,
  entry: SetVerificationParams
): Promise<void> {
  // 기존 레코드 삭제 (같은 이메일)
  await prisma.verificationCode.deleteMany({
    where: { email },
  });

  await prisma.verificationCode.create({
    data: {
      email: entry.email,
      name: entry.name,
      passwordHash: entry.passwordHash,
      code: entry.code,
      expiresAt: new Date(entry.expiresAt),
      attempts: 0,
    },
  });
}

/**
 * 인증 코드 조회
 */
export async function getVerification(email: string) {
  const record = await prisma.verificationCode.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return undefined;

  return {
    code: record.code,
    email: record.email,
    name: record.name,
    passwordHash: record.passwordHash,
    expiresAt: record.expiresAt.getTime(),
    attempts: record.attempts,
    id: record.id,
  };
}

/**
 * 시도 횟수 증가
 */
export async function incrementAttempts(email: string): Promise<void> {
  const record = await prisma.verificationCode.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });

  if (record) {
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
  }
}

/**
 * 인증 코드 삭제
 */
export async function deleteVerification(email: string): Promise<void> {
  await prisma.verificationCode.deleteMany({
    where: { email },
  });
}

/**
 * 만료 여부 확인
 */
export function isExpired(entry: { expiresAt: number }): boolean {
  return entry.expiresAt < Date.now();
}
```

> **BREAKING CHANGE**: 모든 함수가 `async`로 변경됨. API 라우트에서 `await` 필수.

---

### Phase 4: API 라우트 수정 (signup/verify/resend) `category:ultrabrain`

- [ ] `app/api/auth/signup/route.ts` 수정 (base64 → bcrypt, async store)
- [ ] `app/api/auth/verify/route.ts` 수정 (DB User 생성, async store)
- [ ] `app/api/auth/resend/route.ts` 수정 (async store)

**파일: `app/api/auth/signup/route.ts`** (전체 수정)
```typescript
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  generateCode,
  setVerification,
  EXPIRY_MS,
} from "@/lib/verification-store";
import { sendVerificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    // 입력값 검증
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: "이름, 이메일, 비밀번호를 모두 입력해주세요." },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "올바른 이메일 형식을 입력해주세요." },
        { status: 400 }
      );
    }

    // 비밀번호 길이 검증
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "비밀번호는 8자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "이미 가입된 이메일입니다." },
        { status: 409 }
      );
    }

    // 인증 코드 생성
    const code = generateCode();
    const expiresAt = Date.now() + EXPIRY_MS;

    // bcrypt 해싱 (salt rounds: 12)
    const passwordHash = await bcrypt.hash(password, 12);

    // 인증 코드 DB 저장
    await setVerification(email, {
      code,
      email,
      name,
      passwordHash,
      expiresAt,
    });

    // 이메일 발송
    const emailResult = await sendVerificationEmail(email, name, code);
    if (!emailResult.success) {
      console.error("[signup] Failed to send email:", emailResult.error);
      return NextResponse.json(
        {
          success: false,
          error: `이메일 발송에 실패했습니다: ${
            (emailResult.error as Error)?.message ||
            "서버 오류 (서버 재시작이 필요할 수 있습니다)"
          }`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "인증 코드가 발송되었습니다. 이메일을 확인해주세요.",
      ...(process.env.NODE_ENV === "development" && { devCode: code }),
    });
  } catch (error) {
    console.error("[signup] error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
```

**파일: `app/api/auth/verify/route.ts`** (전체 수정)
```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  getVerification,
  deleteVerification,
  incrementAttempts,
  isExpired,
  MAX_ATTEMPTS,
} from "@/lib/verification-store";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: "이메일과 인증 코드를 입력해주세요." },
        { status: 400 }
      );
    }

    const entry = await getVerification(email);

    if (!entry) {
      return NextResponse.json(
        {
          success: false,
          error: "인증 요청을 찾을 수 없습니다. 다시 회원가입을 시도해주세요.",
        },
        { status: 404 }
      );
    }

    // 만료 체크
    if (isExpired(entry)) {
      await deleteVerification(email);
      return NextResponse.json(
        {
          success: false,
          error: "인증 코드가 만료되었습니다. 재발송을 눌러주세요.",
          expired: true,
        },
        { status: 410 }
      );
    }

    // 시도 횟수 제한
    if (entry.attempts >= MAX_ATTEMPTS) {
      await deleteVerification(email);
      return NextResponse.json(
        {
          success: false,
          error: "인증 시도 횟수를 초과했습니다. 다시 회원가입을 시도해주세요.",
          tooManyAttempts: true,
        },
        { status: 429 }
      );
    }

    // 코드 검증
    if (entry.code !== code.trim()) {
      await incrementAttempts(email);
      const remaining = MAX_ATTEMPTS - (entry.attempts + 1);
      return NextResponse.json(
        {
          success: false,
          error: `인증 코드가 올바르지 않습니다. (남은 시도: ${remaining}회)`,
        },
        { status: 400 }
      );
    }

    // 인증 성공 — DB에 User 생성
    const user = await prisma.user.create({
      data: {
        email: entry.email,
        name: entry.name,
        passwordHash: entry.passwordHash,
        emailVerified: true,
      },
    });

    // 인증 코드 삭제
    await deleteVerification(email);

    console.log(`[AUTH] User verified and created: ${email} (id: ${user.id})`);

    return NextResponse.json({
      success: true,
      message: "이메일 인증이 완료되었습니다.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("[verify] error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
```

**파일: `app/api/auth/resend/route.ts`** (전체 수정)
```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  getVerification,
  setVerification,
  generateCode,
  EXPIRY_MS,
} from "@/lib/verification-store";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "이메일을 입력해주세요." },
        { status: 400 }
      );
    }

    const entry = await getVerification(email);

    if (!entry) {
      return NextResponse.json(
        {
          success: false,
          error: "인증 요청을 찾을 수 없습니다. 다시 회원가입을 시도해주세요.",
        },
        { status: 404 }
      );
    }

    // 새 코드 생성 (기존 정보 유지)
    const newCode = generateCode();
    const expiresAt = Date.now() + EXPIRY_MS;

    await setVerification(email, {
      code: newCode,
      email: entry.email,
      name: entry.name,
      passwordHash: entry.passwordHash,
      expiresAt,
    });

    // 이메일 발송
    const emailResult = await sendVerificationEmail(email, entry.name, newCode);
    if (!emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "이메일 재발송에 실패했습니다. 다시 시도해주세요.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "인증 코드가 재발송되었습니다.",
      ...(process.env.NODE_ENV === "development" && { devCode: newCode }),
    });
  } catch (error) {
    console.error("[resend] error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
```

---

### Phase 5: NextAuth v5 설정 `category:ultrabrain`

- [ ] `auth.ts` 생성 (프로젝트 루트)
- [ ] `app/api/auth/[...nextauth]/route.ts` 생성

**파일: `auth.ts`** (신규 -- 프로젝트 루트)
```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return null;
        }

        if (!user.emailVerified) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
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
```

**파일: `app/api/auth/[...nextauth]/route.ts`** (신규)
```typescript
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

---

### Phase 6: 로그인 API + AuthProvider + auth-store 수정 `category:ultrabrain`

- [ ] `app/api/auth/login/route.ts` 생성
- [ ] `components/providers/AuthProvider.tsx` 생성
- [ ] `store/auth-store.ts` 수정 (NextAuth session 연동)
- [ ] `middleware.ts` 생성 (보호 라우트)
- [ ] `app/layout.tsx` 수정 (AuthProvider 래핑)

**파일: `app/api/auth/login/route.ts`** (신규)
```typescript
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "이메일과 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { success: false, error: "이메일 인증이 완료되지 않았습니다." },
        { status: 403 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    // NOTE: 실제 로그인 세션은 NextAuth signIn()이 처리.
    // 이 라우트는 클라이언트에서 사전 검증용으로 사용하거나,
    // signIn("credentials", { ... })을 직접 호출하는 방식으로 대체 가능.
    return NextResponse.json({
      success: true,
      message: "로그인 성공",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("[login] error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
```

**파일: `components/providers/AuthProvider.tsx`** (신규)
```tsx
"use client";

import { SessionProvider } from "next-auth/react";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

**파일: `store/auth-store.ts`** (전체 수정)
```typescript
import { create } from "zustand";
import type { AuthState, User } from "@/types";

/**
 * NextAuth 세션과 연동되는 auth store.
 * persist 제거 — NextAuth JWT cookie가 세션 관리 담당.
 * 이 store는 클라이언트 UI 상태 동기화용.
 */
export const useAuthStore = create<AuthState>()((set) => ({
  isLoggedIn: false,
  user: null,
  login: (user?: User) =>
    set({
      isLoggedIn: true,
      user: user ?? null,
    }),
  logout: () => set({ isLoggedIn: false, user: null }),
}));
```

**파일: `middleware.ts`** (신규 -- 프로젝트 루트)
```typescript
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // 보호 라우트 목록
  const protectedPaths = ["/mypage", "/liked"];
  const isProtected = protectedPaths.some((path) =>
    nextUrl.pathname.startsWith(path)
  );

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/mypage/:path*", "/liked/:path*"],
};
```

**파일: `app/layout.tsx`** (수정 -- AuthProvider 래핑 추가)
```tsx
import type { Metadata } from "next";
import { Outfit, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/ui/Navbar";
import { InitialLoader } from "@/components/ui/InitialLoader";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { Footer } from "@/components/ui/Footer";
import { AuthProvider } from "@/components/providers/AuthProvider";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "POTATA - Seoul to Dubai",
  description: "Premier Korean Fashion for UAE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          outfit.variable,
          notoSansKr.variable,
          "font-sans min-h-screen bg-background text-foreground"
        )}
      >
        <AuthProvider>
          <InitialLoader />
          <CustomCursor />
          <Navbar />
          {children}
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

### Phase 7: 검증 체크리스트 `category:quick`

- [ ] `npx prisma db push` 성공 확인
- [ ] `npx prisma studio` 로 테이블 확인 (User, VerificationCode)
- [ ] 회원가입 플로우 테스트: signup → 이메일 수신 → verify → User DB 확인
- [ ] 로그인 테스트: credentials로 signIn → 세션 확인 (`useSession()`)
- [ ] 보호 라우트 테스트: 미로그인 시 /mypage 접근 → /login 리다이렉트
- [ ] `npm run build` 에러 없이 빌드 성공
- [ ] Vercel 배포 시 환경변수 설정 확인 (DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, NEXTAUTH_URL)

---

## Test Strategy

- [ ] 수동 E2E 테스트: 회원가입 → 이메일 인증 → 로그인 → 보호 라우트 접근 → 로그아웃
- [ ] Prisma Studio로 DB 상태 직접 확인
- [ ] 에러 케이스: 중복 이메일, 잘못된 코드, 만료된 코드, 시도 초과, 잘못된 비밀번호

## Success Criteria

- [ ] 인메모리 store 완전 제거, 모든 인증 데이터가 Supabase PostgreSQL에 저장
- [ ] bcrypt로 비밀번호 해싱 (base64 제거)
- [ ] NextAuth v5 세션이 JWT cookie로 동작
- [ ] 보호 라우트 middleware 동작
- [ ] `npm run build` 성공
- [ ] Vercel 배포 성공

---

## Antigravity 전달 컨텍스트

### 프로젝트 요약
- **프로젝트**: Potata - 한국 패션 UAE 플랫폼 (Next.js 16 + React 19)
- **현재 상태**: 인메모리 인증 (회원가입/이메일 인증은 동작), DB/세션 없음
- **목표**: Supabase PostgreSQL + Prisma + NextAuth v5로 프로덕션 인증 완성

### 작업 순서
1. 패키지 설치 (`@prisma/client`, `next-auth@beta`, `bcryptjs`, `prisma`, `@types/bcryptjs`)
2. `prisma/schema.prisma` + `lib/prisma.ts` 생성 → `npx prisma db push`
3. `lib/verification-store.ts` 전면 재작성 (sync → async, Map → Prisma)
4. API 라우트 3개 수정 (signup, verify, resend) -- 모든 store 함수에 `await` 추가
5. `auth.ts` + `app/api/auth/[...nextauth]/route.ts` 생성
6. `app/api/auth/login/route.ts` + `components/providers/AuthProvider.tsx` 생성
7. `store/auth-store.ts` 수정 (persist 제거)
8. `middleware.ts` 생성
9. `app/layout.tsx`에 AuthProvider 래핑
10. `.env.example` 업데이트

### 핵심 주의사항
- verification-store의 모든 함수가 **sync → async**로 변경됨. 호출부에서 반드시 `await` 필요.
- `signup/route.ts`에 이메일 중복 확인 로직 추가됨 (`prisma.user.findUnique`)
- `verify/route.ts`에서 `prisma.user.create`로 실제 DB 유저 생성
- `auth-store.ts`에서 `persist` 미들웨어 제거 (NextAuth cookie가 대체)
- NextAuth v5는 `@beta` 태그로 설치 (`next-auth@beta`)
- `.env.local`에 DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, NEXTAUTH_URL 필수

### 환경변수 (반드시 .env.local에 설정)
```
DATABASE_URL=postgresql://...  (Supabase pooler, port 6543)
DIRECT_URL=postgresql://...    (Supabase direct, port 5432)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=(openssl rand -base64 32)
```
