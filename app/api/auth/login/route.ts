import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "이메일과 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { success: false, error: "이메일 인증이 완료되지 않았습니다." },
        { status: 403 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    // NOTE: 실제 로그인 세션은 NextAuth signIn()이 처리.
    // 이 라우트는 클라이언트에서 사전 검증용으로 사용하거나,
    // signIn("credentials", { ... })을 직접 호출하는 방식으로 대체 가능.
    return NextResponse.json({
      success: true,
      message: "로그인 성공",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("[login] error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
