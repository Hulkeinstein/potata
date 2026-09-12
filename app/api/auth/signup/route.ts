import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@/lib/email";
import {
  extractErrorMessage,
  generateVerificationCode,
  isValidEmail,
  VERIFICATION_EXPIRY_MS,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
} from "@/lib/auth";
import { isLegalSignupReady } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import type { SignupRequest } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SignupRequest>;
    const email = normalizeEmail(body.email ?? "");
    const password = body.password?.trim() ?? "";
    const name = email.split("@", 1)[0] ?? "New member";

    if (!isLegalSignupReady()) {
      return NextResponse.json({ success: false, error: "회원가입 준비가 완료되지 않았습니다." }, { status: 503 });
    }
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "이메일과 비밀번호를 모두 입력해주세요." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: "올바른 이메일 형식을 입력해주세요." },
        { status: 400 }
      );
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { success: false, error: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser?.emailVerified) {
      return NextResponse.json(
        { success: false, error: "이미 가입된 이메일입니다. 로그인해주세요." },
        { status: 409 }
      );
    }

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_MS);
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.upsert({
        where: { email },
        update: {
          // 재가입 시 handle은 변경하지 않음 — 기존 핸들 보존
          name,
          passwordHash,
          emailVerified: false,
        },
        create: {
          email,
          name,
          passwordHash,
          emailVerified: false,
        },
      }),
      prisma.verificationCode.deleteMany({
        where: { email },
      }),
      prisma.verificationCode.create({
        data: {
          email,
          name,
          passwordHash,
          code,
          expiresAt,
        },
      }),
    ]);

    const emailResult = await sendVerificationEmail(email, name, code);
    if (!emailResult.success) {
      console.error("[signup] Failed to send email:", emailResult.error);
      return NextResponse.json(
        { success: false, error: `이메일 발송에 실패했습니다: ${emailResult.error ?? "서버 오류"}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "인증 코드가 발송되었습니다. 이메일을 확인해주세요.",
      ...(process.env.NODE_ENV === "development" && { devCode: code }),
    });
  } catch (error) {
    // Prisma unique 제약 위반(P2002) — 동시 가입 경쟁 최종 방어
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, error: "이미 사용 중인 이메일입니다." },
        { status: 409 }
      );
    }
    console.error("[signup] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}
