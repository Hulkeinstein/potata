import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { userFindUnique, codeFindFirst, codeDeleteMany, codeCreate, transaction, sendEmail } = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  codeFindFirst: vi.fn(),
  codeDeleteMany: vi.fn(),
  codeCreate: vi.fn(),
  transaction: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    verificationCode: { findFirst: codeFindFirst, deleteMany: codeDeleteMany, create: codeCreate },
    $transaction: transaction,
  },
}));
vi.mock("@/lib/email", () => ({ sendVerificationEmail: sendEmail }));

import { POST } from "./route";
import { resetRateLimitsForTests } from "@/lib/rate-limit";

function resendRequest(email = "pending@example.com") {
  return new Request("http://localhost/api/auth/resend", {
    method: "POST",
    body: JSON.stringify({ email }),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimitsForTests();
  transaction.mockResolvedValue([]);
  sendEmail.mockResolvedValue({ success: true });
});

describe("resend route", () => {
  it("계정이 아니라 인증 대기 기록의 비밀번호로 새 코드를 만든다", async () => {
    userFindUnique.mockResolvedValue({ name: "pending", emailVerified: false, passwordHash: null });
    codeFindFirst.mockResolvedValue({ name: "pending", passwordHash: "$2a$10$fromEntry" });

    const response = await POST(resendRequest());

    expect(response.status).toBe(200);
    expect(codeCreate.mock.calls[0][0].data.passwordHash).toBe("$2a$10$fromEntry");
  });

  it("같은 발신지(IP)에서 주소를 바꿔 가며 재발송해도 20회를 넘으면 429로 막는다", async () => {
    userFindUnique.mockResolvedValue({ name: "pending", emailVerified: false, passwordHash: null });
    codeFindFirst.mockResolvedValue({ name: "pending", passwordHash: "$2a$10$fromEntry" });

    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect((await POST(resendRequest(`pending${attempt}@example.com`))).status).toBe(200);
    }

    const blocked = await POST(resendRequest("pending20@example.com"));

    expect(blocked.status).toBe(429);
    expect(sendEmail).toHaveBeenCalledTimes(20);
  });

  it("메일 발송 실패 원문(설정 힌트·운영자 이메일)은 응답에 싣지 않고 서버 로그에 남긴다", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    userFindUnique.mockResolvedValue({ name: "pending", emailVerified: false, passwordHash: null });
    codeFindFirst.mockResolvedValue({ name: "pending", passwordHash: "$2a$10$fromEntry" });
    sendEmail.mockResolvedValue({ success: false, error: "RESEND_API_KEY 가 설정되지 않았습니다. 서버 설정을 확인해주세요. owner@potata.example" });

    const response = await POST(resendRequest());
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).not.toContain("RESEND_API_KEY");
    expect(text).not.toContain("owner@potata.example");
    expect(consoleError).toHaveBeenCalledWith("[resend] Failed to send email:", "RESEND_API_KEY 가 설정되지 않았습니다. 서버 설정을 확인해주세요. owner@potata.example");
    consoleError.mockRestore();
  });

  it("같은 주소로 반복 재발송하면 429로 막는다", async () => {
    userFindUnique.mockResolvedValue({ name: "pending", emailVerified: false, passwordHash: null });
    codeFindFirst.mockResolvedValue({ name: "pending", passwordHash: "$2a$10$fromEntry" });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect((await POST(resendRequest())).status).toBe(200);
    }

    const blocked = await POST(resendRequest());

    expect(blocked.status).toBe(429);
    expect(sendEmail).toHaveBeenCalledTimes(3);
  });

  it("인증 대기 기록이 없으면 404", async () => {
    userFindUnique.mockResolvedValue({ name: "oauth", emailVerified: false, passwordHash: null });
    codeFindFirst.mockResolvedValue(null);

    const response = await POST(resendRequest());

    expect(response.status).toBe(404);
    expect(codeCreate).not.toHaveBeenCalled();
  });

  it("이미 인증된 계정이면 404", async () => {
    userFindUnique.mockResolvedValue({ name: "done", emailVerified: true, passwordHash: "$2a$10$x" });
    codeFindFirst.mockResolvedValue({ name: "done", passwordHash: "$2a$10$x" });

    const response = await POST(resendRequest());

    expect(response.status).toBe(404);
    expect(codeCreate).not.toHaveBeenCalled();
  });
});
