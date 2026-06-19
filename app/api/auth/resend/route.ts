import { NextRequest, NextResponse } from "next/server";
import { sendVerificationEmail } from "@/lib/email";
import {
  extractErrorMessage,
  generateVerificationCode,
  normalizeEmail,
  VERIFICATION_EXPIRY_MS,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ResendVerificationRequest } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<ResendVerificationRequest>;
    const email = normalizeEmail(body.email ?? "");

    if (!email) {
      return NextResponse.json(
        { success: false, error: "이메일을 입력해주세요." },
        { status: 400 }
      );
    }

    const [user, entry] = await Promise.all([
      prisma.user.findUnique({
        where: { email },
      }),
      prisma.verificationCode.findFirst({
        where: { email },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // passwordHash 없는 유저(OAuth 전용)는 이메일 인증 재발송 대상이 아님
    if (!user || user.emailVerified || !user.passwordHash || !entry) {
      return NextResponse.json(
        { success: false, error: "인증 요청을 찾을 수 없습니다. 다시 회원가입을 시도해주세요." },
        { status: 404 }
      );
    }

    const newCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_MS);

    await prisma.$transaction([
      prisma.verificationCode.deleteMany({
        where: { email },
      }),
      prisma.verificationCode.create({
        data: {
          email,
          name: user.name,
          passwordHash: user.passwordHash,
          code: newCode,
          expiresAt,
        },
      }),
    ]);

    const emailResult = await sendVerificationEmail(email, user.name, newCode);
    if (!emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: emailResult.error ?? "이메일 재발송에 실패했습니다. 다시 시도해주세요.",
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
      { success: false, error: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}
