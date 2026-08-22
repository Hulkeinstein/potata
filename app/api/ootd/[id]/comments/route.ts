import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { OOTDCommentItem } from "@/types";

const PAGE_SIZE = 20;
const publicAuthor = { id: true, name: true, handle: true, avatar: true } as const;

type RouteContext = { params: Promise<{ id: string }> };

function mapComment(
  row: {
    id: string;
    postId: string;
    content: string;
    createdAt: Date;
    user: { id: string; name: string; handle: string | null; avatar: string | null };
  },
  viewerId: string | undefined,
): OOTDCommentItem {
  return {
    id: row.id,
    postId: row.postId,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    author: row.user,
    isMine: viewerId === row.user.id,
  };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id: postId } = await params;
    const session = await auth();
    const cursor = new URL(request.url).searchParams.get("cursor");

    const post = await prisma.oOTDPost.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) {
      return NextResponse.json({ success: false, error: "게시물을 찾을 수 없습니다." }, { status: 404 });
    }
    if (cursor) {
      const validCursor = await prisma.oOTDComment.findFirst({
        where: { id: cursor, postId },
        select: { id: true },
      });
      if (!validCursor) {
        return NextResponse.json({ success: false, error: "Invalid cursor" }, { status: 400 });
      }
    }

    const rows = await prisma.oOTDComment.findMany({
      where: { postId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        postId: true,
        content: true,
        createdAt: true,
        user: { select: publicAuthor },
      },
    });
    const viewerId = session?.user?.id;
    return NextResponse.json({
      success: true,
      data: {
        items: rows.map((row) => mapComment(row, viewerId)),
        nextCursor: rows.length === PAGE_SIZE ? rows[PAGE_SIZE - 1]?.id ?? null : null,
      },
    });
  } catch (error) {
    console.error("[ootd comments GET] error:", error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id: postId } = await params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
    }
    if (typeof body !== "object" || body === null || !("content" in body) || typeof body.content !== "string") {
      return NextResponse.json({ success: false, error: "댓글 내용을 입력해 주세요." }, { status: 400 });
    }
    const content = body.content.trim();
    if (content.length === 0 || content.length > 500) {
      return NextResponse.json({ success: false, error: "댓글은 1자 이상 500자 이하여야 합니다." }, { status: 400 });
    }
    const post = await prisma.oOTDPost.findUnique({
      where: { id: postId },
      select: { id: true, userId: true },
    });
    if (!post) {
      return NextResponse.json({ success: false, error: "게시물을 찾을 수 없습니다." }, { status: 404 });
    }

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.oOTDComment.create({
        data: { postId, userId: session.user.id, content },
        select: {
          id: true,
          postId: true,
          content: true,
          createdAt: true,
          user: { select: publicAuthor },
        },
      });
      if (post.userId !== session.user.id) {
        await tx.notification.create({
          data: {
            recipientId: post.userId,
            actorId: session.user.id,
            postId,
            type: "COMMENT",
            sourceCommentId: created.id,
          },
        });
      }
      return created;
    });

    return NextResponse.json(
      { success: true, data: mapComment(comment, session.user.id) },
      { status: 201 },
    );
  } catch (error) {
    console.error("[ootd comments POST] error:", error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
