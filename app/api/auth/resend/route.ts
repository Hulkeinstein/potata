import { NextRequest, NextResponse } from "next/server";
import { sendVerificationEmail } from "@/lib/email";
import {
  extractErrorMessage,
  generateVerificationCode,
  normalizeEmail,
  VERIFICATION_EXPIRY_MS,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";
import type { ResendVerificationRequest } from "@/types";

const RESEND_WINDOW_MS = 10 * 60 * 1000;
const RESEND_LIMIT_PER_EMAIL = 3;
const RESEND_LIMIT_PER_IP = 20;

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

    // 재발송은 곧바로 메일 발송으로 이어진다 — 주소당·발신지당 횟수를 제한한다.
    if (
      !consumeRateLimit(`resend:email:${email}`, RESEND_LIMIT_PER_EMAIL, RESEND_WINDOW_MS) ||
      !consumeRateLimit(`resend:ip:${clientIp(req)}`, RESEND_LIMIT_PER_IP, RESEND_WINDOW_MS)
    ) {
      return NextResponse.json(
        { success: false, error: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
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

    // 비밀번호는 인증 대기 기록(VerificationCode)에만 있다 — 대기 기록이 없으면 재발송 대상이 아님(OAuth 전용 유저 포함)
    if (!user || user.emailVerified || !entry) {
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
          name: entry.name,
          passwordHash: entry.passwordHash,
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
