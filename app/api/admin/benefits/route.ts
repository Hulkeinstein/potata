import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { createCampaign, createPointPolicy, deactivateCampaign, grantPoints, issueCoupon, listAdminBenefits, previewAudience, reversePoints, revokeCoupon, updateCampaign, BenefitInputError } from "@/lib/benefits/admin-service";
import { parseAdminCommand } from "@/lib/benefits/admin-command";
import { AdminReauthRateLimitError, verifyAdminReauth } from "@/lib/benefits/admin-reauth";
import { consumeGoogleStepUp } from "@/lib/benefits/admin-step-up";
import { prisma } from "@/lib/prisma";

async function adminSession() {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
  if (!isAdmin(session.user.email)) return { error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
  return { userId: session.user.id };
}

export async function GET() {
  const gate = await adminSession();
  if (gate.error) return gate.error;
  const user = await prisma.user.findUnique({ where: { id: gate.userId }, select: { passwordHash: true } });
  return NextResponse.json({ success: true, data: { ...(await listAdminBenefits()), reauthMethod: user?.passwordHash ? "PASSWORD" : "GOOGLE" } });
}

export async function POST(request: Request) {
  const gate = await adminSession();
  if (gate.error) return gate.error;
  try {
    const command = parseAdminCommand(await request.json());
    if (!command) return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    if (command.action !== "PREVIEW") {
      const authorized = command.reauthPassword
        ? await verifyAdminReauth(gate.userId, command.reauthPassword)
        : command.reauthProof ? await consumeGoogleStepUp(gate.userId, command.reauthProof) : false;
      if (!authorized) return NextResponse.json({ success: false, error: "관리자 재인증에 실패했습니다." }, { status: 403 });
    }
    switch (command.action) {
      case "CREATE_CAMPAIGN": return NextResponse.json({ success: true, data: await createCampaign(gate.userId, command.input, command.idempotencyKey) });
      case "UPDATE_CAMPAIGN": return NextResponse.json({ success: true, data: await updateCampaign(gate.userId, command.campaignId, command.input, command.idempotencyKey) });
      case "DEACTIVATE_CAMPAIGN": return NextResponse.json({ success: true, data: await deactivateCampaign(gate.userId, command.campaignId, command) });
      case "PREVIEW": return NextResponse.json({ success: true, data: await previewAudience(command.campaignId, command.audience, command.email) });
      case "ISSUE": return NextResponse.json({ success: true, data: await issueCoupon(gate.userId, command) });
      case "REVOKE_COUPON": return NextResponse.json({ success: true, data: await revokeCoupon(gate.userId, command) });
      case "CREATE_POINT_POLICY": return NextResponse.json({ success: true, data: await createPointPolicy(gate.userId, command.input, command.idempotencyKey) });
      case "GRANT_POINTS": return NextResponse.json({ success: true, data: await grantPoints(gate.userId, command.input) });
      case "REVERSE_POINTS": return NextResponse.json({ success: true, data: await reversePoints(gate.userId, command) });
    }
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    if (error instanceof AdminReauthRateLimitError) return NextResponse.json({ success: false, error: "관리자 재인증 시도가 제한되었습니다." }, { status: 429, headers: { "Retry-After": "300" } });
    if (error instanceof BenefitInputError) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    console.error("[admin benefits] error", error);
    return NextResponse.json({ success: false, error: "Benefits operation failed" }, { status: 500 });
  }
}
