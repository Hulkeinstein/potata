import { NextRequest, NextResponse } from "next/server";
import {
  getVerification,
  deleteVerification,
  incrementAttempts,
  isExpired,
  MAX_ATTEMPTS,
} from "@/lib/verification-store";
import {
  extractErrorMessage,
  normalizeEmail,
  VERIFICATION_CODE_LENGTH,
} from "@/lib/auth";
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

    const entry = getVerification(email);

    if (!entry) {
      return NextResponse.json(
        { success: false, error: "인증 요청을 찾을 수 없습니다. 다시 회원가입을 시도해주세요." },
        { status: 404 }
      );
    }

    if (isExpired(entry)) {
      deleteVerification(email);
      return NextResponse.json(
        { success: false, error: "인증 코드가 만료되었습니다. 재발송을 눌러주세요.", expired: true },
        { status: 410 }
      );
    }

    if (entry.attempts >= MAX_ATTEMPTS) {
      deleteVerification(email);
      return NextResponse.json(
        { success: false, error: "인증 시도 횟수를 초과했습니다. 다시 회원가입을 시도해주세요.", tooManyAttempts: true },
        { status: 429 }
      );
    }

    if (entry.code !== code) {
      incrementAttempts(email);
      const remaining = MAX_ATTEMPTS - (entry.attempts + 1);
      return NextResponse.json(
        {
          success: false,
          error: `인증 코드가 올바르지 않습니다. (남은 시도: ${remaining}회)`,
        },
        { status: 400 }
      );
    }

    const user = {
      id: `user-${Date.now()}`,
      email: entry.email,
      name: entry.name,
    };

    console.log(`[AUTH] User verified and created: ${email}`);
    deleteVerification(email);

    return NextResponse.json({
      success: true,
      message: "이메일 인증이 완료되었습니다.",
      user,
    });
  } catch (error) {
    console.error("[verify] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}
