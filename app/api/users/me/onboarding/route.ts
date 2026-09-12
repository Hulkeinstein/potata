import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { LEGAL_LOCALE, LEGAL_VERSION, isLegalSignupReady, parseOnboardingInput } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { toUserSettingsData } from "@/lib/user-settings";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, avatar: true, handle: true, onboardingCompletedAt: true, settings: { select: { preferredSize: true, aiCoordinatorEnabled: true, heightCm: true, weightKg: true } } },
  });
  if (!user) return NextResponse.json({ success: false, error: "계정을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ success: true, data: { ...user, settings: toUserSettingsData(user.settings), legalVersion: LEGAL_VERSION } });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return NextResponse.json({ success: false, error: "JSON 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const parsed = parseOnboardingInput(body);
  if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id: session.user.id }, select: { handle: true, onboardingCompletedAt: true } });
      if (!current) throw new Error("ACCOUNT_NOT_FOUND");
      if (current.onboardingCompletedAt) return { handle: current.handle, completed: true };
      if (current.handle && current.handle !== parsed.value.handle) throw new Error("HANDLE_LOCKED");

      const definitions = [
        { type: "TERMS" as const, version: parsed.value.termsVersion, contentHash: "potata-terms-draft-2026-09-01" },
        { type: "PRIVACY" as const, version: parsed.value.privacyVersion, contentHash: "potata-privacy-draft-2026-09-01" },
        { type: "MARKETING" as const, version: LEGAL_VERSION, contentHash: "potata-marketing-draft-2026-09-01" },
      ];
      const documents = await Promise.all(definitions.map((definition) => tx.legalDocumentVersion.upsert({
        where: { type_version_locale: { type: definition.type, version: definition.version, locale: LEGAL_LOCALE } },
        update: {},
        create: { ...definition, locale: LEGAL_LOCALE, status: isLegalSignupReady() && process.env.NODE_ENV === "production" ? "PUBLISHED" : "DRAFT" },
      })));
      const completedAt = new Date();
      const user = await tx.user.update({
        where: { id: session.user.id },
        data: { name: parsed.value.name, handle: parsed.value.handle, onboardingCompletedAt: completedAt },
        select: { handle: true },
      });
      await tx.userSettings.upsert({ where: { userId: session.user.id }, create: { userId: session.user.id, ...parsed.value.settings }, update: parsed.value.settings });
      await tx.userConsent.createMany({ data: documents.map((document) => ({ userId: session.user.id, documentVersionId: document.id, action: document.type === "MARKETING" && !parsed.value.marketingAccepted ? "WITHDRAW" : "GRANT", source: "ONBOARDING_PROFILE" })) });
      return { handle: user.handle, completed: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_NOT_FOUND") return NextResponse.json({ success: false, error: "계정을 찾을 수 없습니다." }, { status: 404 });
    if (error instanceof Error && error.message === "HANDLE_LOCKED") return NextResponse.json({ success: false, error: "이미 설정한 핸들은 변경할 수 없습니다." }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ success: false, error: "이미 사용 중인 핸들입니다." }, { status: 409 });
    console.error("[me/onboarding PATCH] error:", error);
    return NextResponse.json({ success: false, error: "프로필을 저장하지 못했습니다." }, { status: 500 });
  }
}
