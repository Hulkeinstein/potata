import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { userFindUnique, userUpsert, codeDeleteMany, codeCreate, transaction, sendEmail } = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userUpsert: vi.fn(),
  codeDeleteMany: vi.fn(),
  codeCreate: vi.fn(),
  transaction: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUnique, upsert: userUpsert },
    verificationCode: { deleteMany: codeDeleteMany, create: codeCreate },
    $transaction: transaction,
  },
}));
vi.mock("@/lib/email", () => ({ sendVerificationEmail: sendEmail }));
vi.mock("@/lib/onboarding", () => ({ isLegalSignupReady: () => true }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn(async () => "$2a$10$hashed") } }));

import { POST } from "./route";
import { resetRateLimitsForTests } from "@/lib/rate-limit";

function signupRequest(email = "victim@example.com", password = "attacker-password") {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimitsForTests();
  userFindUnique.mockResolvedValue(null);
  transaction.mockResolvedValue([]);
  sendEmail.mockResolvedValue({ success: true });
});

describe("signup route", () => {
  it("인증 대기 기록에만 비밀번호를 저장하고 계정에는 저장하지 않는다", async () => {
    // 계정에 미인증 비밀번호가 남으면, 그 이메일 주인이 Google로 로그인해 인증되는 순간 탈취된다.
    const response = await POST(signupRequest());

    expect(response.status).toBe(200);
    const upsertArg = userUpsert.mock.calls[0][0];
    expect(upsertArg.update).not.toHaveProperty("passwordHash");
    expect(upsertArg.create).not.toHaveProperty("passwordHash");
    expect(codeCreate.mock.calls[0][0].data.passwordHash).toBe("$2a$10$hashed");
  });

  it("같은 주소로 반복 요청하면 429로 막는다(인증메일 폭탄 방지)", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await POST(signupRequest())).status).toBe(200);
    }

    const blocked = await POST(signupRequest());

    expect(blocked.status).toBe(429);
    expect(sendEmail).toHaveBeenCalledTimes(5);
  });

  it("이미 인증된 이메일이면 409로 막고 아무것도 쓰지 않는다", async () => {
    userFindUnique.mockResolvedValue({ id: "u1", emailVerified: true });

    const response = await POST(signupRequest());

    expect(response.status).toBe(409);
    expect(userUpsert).not.toHaveBeenCalled();
    expect(codeCreate).not.toHaveBeenCalled();
  });
});
