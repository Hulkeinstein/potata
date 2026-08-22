import { Resend } from "resend";
import { VerificationEmail } from "@/emails/VerificationEmail";
import { render } from "@react-email/render";

export type EmailDeliveryResult =
  | { readonly success: true; readonly messageId?: string }
  | { readonly success: false; readonly error: string };

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  code: string
): Promise<EmailDeliveryResult> {
  try {
    if (
      process.env.NODE_ENV === "development" &&
      process.env.EMAIL_DELIVERY_MODE === "preview"
    ) {
      return { success: true, messageId: "local-preview" };
    }

    const sender = process.env.EMAIL_FROM;
    if (process.env.NODE_ENV === "production" && !sender) {
      return {
        success: false,
        error: "EMAIL_FROM 가 설정되지 않았습니다. 서버 설정을 확인해주세요.",
      };
    }

    const resend = getResendClient();
    if (!resend) {
      return {
        success: false,
        error: "RESEND_API_KEY 가 설정되지 않았습니다. 서버 설정을 확인해주세요.",
      };
    }

    // 주의: 실제 배포 환경에서는 도메인 인증 후, '인증된 도메인 이메일'로 교체해야 합니다.
    // 샌드박스 상태(테스트용)에서는 onboarding@resend.dev 에서 본인 이메일로만 발송 가능합니다.
    const htmlContent = await render(VerificationEmail({ name, code }));

    const { data, error } = await resend.emails.send({
      from: sender ?? "onboarding@resend.dev",
      to: [email],
      subject: "Potata 플랫폼 이메일 인증 코드가 도착했습니다",
      html: htmlContent,
    });

    if (error) {
      console.error("[Email Sending Error]", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("[Email Exception]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "이메일 발송 중 오류가 발생했습니다.",
    };
  }
}
