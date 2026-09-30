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
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import type { SignupRequest } from "@/types";
import { readJsonBody, requestBodyErrorResponse } from "@/lib/request-body";

const SIGNUP_WINDOW_MS = 10 * 60 * 1000;
const SIGNUP_LIMIT_PER_EMAIL = 5;
const SIGNUP_LIMIT_PER_IP = 20;

export async function POST(req: NextRequest) {
  try {
    const parsedBody = await readJsonBody<Partial<SignupRequest>>(req);
    if (!parsedBody.ok) return requestBodyErrorResponse(parsedBody.error);
    const body = parsedBody.value;
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

    // 인증메일은 실제로 발송되므로(비용·수신자 피해) 주소당·발신지당 횟수를 제한한다.
    if (
      !consumeRateLimit(`signup:email:${email}`, SIGNUP_LIMIT_PER_EMAIL, SIGNUP_WINDOW_MS) ||
      !consumeRateLimit(`signup:ip:${clientIp(req)}`, SIGNUP_LIMIT_PER_IP, SIGNUP_WINDOW_MS)
    ) {
      return NextResponse.json(
        { success: false, error: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
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
        // passwordHash는 User가 아니라 VerificationCode에만 둔다. 인증 전 계정에 비밀번호를
        // 심어두면, 그 이메일 주인이 나중에 Google로 로그인해 emailVerified가 true가 되는 순간
        // 남의 비밀번호로 로그인할 수 있게 된다(계정 탈취). 인증 성공 시 verify가 심는다.
        update: {
          // 재가입 시 handle은 변경하지 않음 — 기존 핸들 보존
          name,
          emailVerified: false,
        },
        create: {
          email,
          name,
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
