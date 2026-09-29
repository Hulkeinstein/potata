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

function resendRequest(email = "pending@example.com") {
  return new Request("http://localhost/api/auth/resend", {
    method: "POST",
    body: JSON.stringify({ email }),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
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
