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
import { validateHandle } from "@/lib/handle";
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

    // handle 서버 재검증 — 폼 클라이언트 입력 신뢰 금지(Zero Trust)
    const handleValidation = validateHandle(body.handle ?? "");
    if (!handleValidation.ok) {
      return NextResponse.json(
        { success: false, error: `핸들: ${handleValidation.error}` },
        { status: 400 }
      );
    }
    const handle = handleValidation.value;

    // handle unique 선행 체크 — Prisma P2002 경쟁 방어는 아래 catch에서
    const existingHandle = await prisma.user.findUnique({
      where: { handle },
      select: { id: true },
    });
    if (existingHandle) {
      return NextResponse.json(
        { success: false, error: "이미 사용 중인 핸들입니다." },
        { status: 409 }
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
          handle, // 신규 가입 시에만 handle 주입
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
        { success: false, error: "이미 사용 중인 핸들 또는 이메일입니다." },
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
