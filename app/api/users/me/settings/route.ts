import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseUserSettingsPatch, toUserSettingsData } from "@/lib/user-settings";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      select: { preferredSize: true, aiCoordinatorEnabled: true },
    });
    return NextResponse.json({ success: true, data: toUserSettingsData(settings) });
  } catch (error) {
    console.error("[me/settings GET] error:", error);
    return NextResponse.json({ success: false, error: "설정을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      return NextResponse.json({ success: false, error: "JSON 형식이 올바르지 않습니다." }, { status: 400 });
    }
    const parsed = parseUserSettingsPatch(body);
    if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    const settings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...parsed.value },
      update: parsed.value,
      select: { preferredSize: true, aiCoordinatorEnabled: true },
    });
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("[me/settings PATCH] error:", error);
    return NextResponse.json({ success: false, error: "설정을 저장하지 못했습니다." }, { status: 500 });
  }
}
