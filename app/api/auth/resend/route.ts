import { NextRequest, NextResponse } from "next/server";
import {
  getVerification,
  setVerification,
  generateCode,
  isExpired,
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

    const entry = getVerification(email);

    if (!entry) {
      return NextResponse.json(
        { success: false, error: "인증 요청을 찾을 수 없습니다. 다시 회원가입을 시도해주세요." },
        { status: 404 }
      );
    }

    // 새 코드 생성 (기존 정보 유지)
    const newCode = generateCode();
    const expiresAt = Date.now() + EXPIRY_MS;

    setVerification(email, {
      code: newCode,
      email: entry.email,
      name: entry.name,
      passwordHash: entry.passwordHash,
      expiresAt,
    });

    // 실제 이메일 발송 처리 (Resend 연동)
    const emailResult = await sendVerificationEmail(email, entry.name, newCode);
    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, error: "이메일 재발송에 실패했습니다. 다시 시도해주세요." },
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
