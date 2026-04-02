import { NextRequest, NextResponse } from "next/server";
import {
  generateCode,
  setVerification,
  EXPIRY_MS,
} from "@/lib/verification-store";
import { sendVerificationEmail } from "@/lib/email";

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

    // 인증 코드 생성
    const code = generateCode();
    const expiresAt = Date.now() + EXPIRY_MS;

    // TODO: 실제 서비스에서는 bcrypt 등으로 해싱
    const passwordHash = Buffer.from(password).toString("base64");

    // 인증 코드 저장
    setVerification(email, {
      code,
      email,
      name,
      passwordHash,
      expiresAt,
    });

    // 실제 이메일 발송 처리 (Resend 연동)
    const emailResult = await sendVerificationEmail(email, name, code);
    if (!emailResult.success) {
      console.error("[signup] Failed to send email:", emailResult.error);
      return NextResponse.json(
        { success: false, error: `이메일 발송에 실패했습니다: ${(emailResult.error as Error)?.message || "서버 오류 (서버 재시작이 필요할 수 있습니다)"}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "인증 코드가 발송되었습니다. 이메일을 확인해주세요.",
      // 개발 환경에서만 코드 노출
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
