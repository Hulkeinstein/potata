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
  normalizeName,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SignupRequest } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SignupRequest>;
    const email = normalizeEmail(body.email ?? "");
    const password = body.password?.trim() ?? "";
    const name = normalizeName(body.name ?? "");

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: "이름, 이메일, 비밀번호를 모두 입력해주세요." },
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
    console.error("[signup] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}
