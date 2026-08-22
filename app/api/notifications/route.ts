import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { NotificationItem } from "@/types";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const recipientId = session.user.id;
    const cursor = new URL(request.url).searchParams.get("cursor");
    if (cursor) {
      const validCursor = await prisma.notification.findFirst({
        where: { id: cursor, recipientId },
        select: { id: true },
      });
      if (!validCursor) {
        return NextResponse.json({ success: false, error: "Invalid cursor" }, { status: 400 });
      }
    }
    const [rows, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { recipientId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          type: true,
          readAt: true,
          createdAt: true,
          actor: { select: { id: true, name: true, handle: true, avatar: true } },
          post: { select: { id: true, imageUrls: true, caption: true } },
        },
      }),
      prisma.notification.count({ where: { recipientId, readAt: null } }),
    ]);
    const items: NotificationItem[] = rows.map((row) => ({
      id: row.id,
      type: row.type,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      actor: row.actor,
      post: { id: row.post.id, imageUrl: row.post.imageUrls[0] ?? null, caption: row.post.caption },
    }));
    return NextResponse.json({
      success: true,
      data: {
        items,
        nextCursor: rows.length === PAGE_SIZE ? rows[PAGE_SIZE - 1]?.id ?? null : null,
        unreadCount,
      },
    });
  } catch (error) {
    console.error("[notifications GET] error:", error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
