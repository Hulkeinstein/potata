import { afterEach, describe, expect, it, vi } from "vitest";

const { resendConstructor, resendSend } = vi.hoisted(() => ({
  resendConstructor: vi.fn(),
  resendSend: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: resendConstructor,
}));

vi.mock("@react-email/render", () => ({
  render: vi.fn().mockResolvedValue("<p>verification</p>"),
}));

import { sendVerificationEmail } from "./email";

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("sendVerificationEmail", () => {
  it("외부 발송 없이 성공한다 when development preview mode", async () => {
    // Given
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("EMAIL_DELIVERY_MODE", "preview");
    vi.stubEnv("RESEND_API_KEY", "");

    // When
    const result = await sendVerificationEmail("local@example.com", "Local", "123456");

    // Then
    expect(result).toEqual({ success: true, messageId: "local-preview" });
    expect(resendConstructor).not.toHaveBeenCalled();
  });

  it("preview 설정을 거부한다 when production", async () => {
    // Given
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_DELIVERY_MODE", "preview");
    vi.stubEnv("RESEND_API_KEY", "");

    // When
    const result = await sendVerificationEmail("user@example.com", "User", "123456");

    // Then
    expect(result.success).toBe(false);
    expect(resendConstructor).not.toHaveBeenCalled();
  });

  it("발송 설정 오류를 반환한다 when production EMAIL_FROM missing", async () => {
    // Given
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_DELIVERY_MODE", "");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "");

    // When
    const result = await sendVerificationEmail("user@example.com", "User", "123456");

    // Then
    expect(result).toEqual({
      success: false,
      error: "EMAIL_FROM 가 설정되지 않았습니다. 서버 설정을 확인해주세요.",
    });
    expect(resendConstructor).not.toHaveBeenCalled();
  });

  it("인증된 발신 주소로 발송한다 when production EMAIL_FROM configured", async () => {
    // Given
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_DELIVERY_MODE", "");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "Potata <verify@example.com>");
    resendSend.mockResolvedValue({ data: { id: "message-1" }, error: null });
    resendConstructor.mockImplementation(function MockResend() {
      return {
      emails: { send: resendSend },
      };
    });

    // When
    const result = await sendVerificationEmail("user@example.com", "User", "123456");

    // Then
    expect(result).toEqual({ success: true, messageId: "message-1" });
    expect(resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Potata <verify@example.com>",
        to: ["user@example.com"],
      })
    );
  });
});
