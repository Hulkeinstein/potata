import { NextRequest, NextResponse } from "next/server";
import {
  MAX_VERIFICATION_ATTEMPTS,
  extractErrorMessage,
  normalizeEmail,
  VERIFICATION_CODE_LENGTH,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { VerifyEmailRequest } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<VerifyEmailRequest>;
    const email = normalizeEmail(body.email ?? "");
    const code = body.code?.trim() ?? "";

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: "이메일과 인증 코드를 입력해주세요." },
        { status: 400 }
      );
    }

    if (code.length !== VERIFICATION_CODE_LENGTH) {
      return NextResponse.json(
        { success: false, error: `${VERIFICATION_CODE_LENGTH}자리 인증 코드를 입력해주세요.` },
        { status: 400 }
      );
    }

    const entry = await prisma.verificationCode.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (!entry) {
      return NextResponse.json(
        { success: false, error: "인증 요청을 찾을 수 없습니다. 다시 회원가입을 시도해주세요." },
        { status: 404 }
      );
    }

    if (entry.expiresAt.getTime() <= Date.now()) {
      await prisma.verificationCode.deleteMany({
        where: { email },
      });
      return NextResponse.json(
        { success: false, error: "인증 코드가 만료되었습니다. 재발송을 눌러주세요.", expired: true },
        { status: 410 }
      );
    }

    if (entry.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      await prisma.verificationCode.deleteMany({
        where: { email },
      });
      return NextResponse.json(
        { success: false, error: "인증 시도 횟수를 초과했습니다. 다시 회원가입을 시도해주세요.", tooManyAttempts: true },
        { status: 429 }
      );
    }

    if (entry.code !== code) {
      await prisma.verificationCode.update({
        where: { id: entry.id },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });
      const remaining = MAX_VERIFICATION_ATTEMPTS - (entry.attempts + 1);
      return NextResponse.json(
        {
          success: false,
          error: `인증 코드가 올바르지 않습니다. (남은 시도: ${remaining}회)`,
        },
        { status: 400 }
      );
    }

    const user = await prisma.$transaction(async (tx) => {
      const verifiedUser = await tx.user.upsert({
        where: { email: entry.email },
        update: {
          name: entry.name,
          passwordHash: entry.passwordHash,
          emailVerified: true,
        },
        create: {
          email: entry.email,
          name: entry.name,
          passwordHash: entry.passwordHash,
          emailVerified: true,
        },
      });

      await tx.verificationCode.deleteMany({
        where: { email },
      });

      return verifiedUser;
    });

    console.log(`[AUTH] User verified: ${email}`);

    return NextResponse.json({
      success: true,
      message: "이메일 인증이 완료되었습니다.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar ?? undefined,
      },
    });
  } catch (error) {
    console.error("[verify] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}
