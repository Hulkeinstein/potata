import { NextRequest, NextResponse } from "next/server";
import {
  getVerification,
  setVerification,
  generateCode,
  isExpired,
  EXPIRY_MS,
} from "@/lib/verification-store";

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

    // 이메일 발송 (현재는 콘솔 로그로 대체)
    console.log(`[EMAIL] Verification code for ${email}: ${newCode}`);

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
