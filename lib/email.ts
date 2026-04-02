import { Resend } from "resend";
import { VerificationEmail } from "@/emails/VerificationEmail";
import { render } from "@react-email/render";

// .env 또는 서버 환경에서 RESEND_API_KEY 로드
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, name: string, code: string) {
  try {
    // 주의: 실제 배포 환경에서는 도메인 인증 후, '인증된 도메인 이메일'로 교체해야 합니다.
    // 샌드박스 상태(테스트용)에서는 onboarding@resend.dev 에서 본인 이메일로만 발송 가능합니다.
    const htmlContent = await render(VerificationEmail({ name, code }));

    const { data, error } = await resend.emails.send({
      // Sandbox mode requires exactly "onboarding@resend.dev"
      from: "onboarding@resend.dev",
      to: [email],
      subject: "Potata 플랫폼 이메일 인증 코드가 도착했습니다",
      html: htmlContent,
    });

    if (error) {
      console.error("[Email Sending Error]", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("[Email Exception]", error);
    return { success: false, error };
  }
}
