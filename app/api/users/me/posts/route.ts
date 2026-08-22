import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { MyPostItem, MyPostsResponse } from "@/types";

const PAGE_SIZE = 12;
const QUERY_SIZE = PAGE_SIZE + 1;

type PostType = MyPostItem["type"];

function parsePostType(value: string | null): PostType | null {
  switch (value) {
    case "ootd":
      return "ootd";
    case "reviews":
      return "review";
    case "questions":
      return "question";
    default:
      return null;
  }
}

const invalidRequest = () =>
  NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });

function page<T extends { readonly id: string }>(rows: readonly T[]) {
  const items = rows.slice(0, PAGE_SIZE);
  return { items, nextCursor: rows.length > PAGE_SIZE ? items[PAGE_SIZE - 1]?.id ?? null : null };
}

async function readOotd(userId: string, cursor: string | null): Promise<MyPostsResponse | null> {
  if (cursor) {
    const owned = await prisma.oOTDPost.findFirst({ where: { id: cursor, userId }, select: { id: true } });
    if (!owned) return null;
  }
  const rows = await prisma.oOTDPost.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: QUERY_SIZE,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, caption: true, imageUrls: true, createdAt: true, _count: { select: { likes: true, comments: true } } },
  });
  const result = page(rows);
  return { success: true, data: { items: result.items.map((row) => ({ type: "ootd", id: row.id, caption: row.caption, imageUrls: row.imageUrls, createdAt: row.createdAt.toISOString(), likeCount: row._count.likes, commentCount: row._count.comments })), nextCursor: result.nextCursor } };
}

async function readReviews(userId: string, cursor: string | null): Promise<MyPostsResponse | null> {
  if (cursor) {
    const owned = await prisma.review.findFirst({ where: { id: cursor, userId }, select: { id: true } });
    if (!owned) return null;
  }
  const rows = await prisma.review.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: QUERY_SIZE,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, productId: true, rating: true, comment: true, imageUrls: true, createdAt: true, updatedAt: true, product: { select: { name: true, imageUrl: true } } },
  });
  const result = page(rows);
  return { success: true, data: { items: result.items.map((row) => ({ type: "review", id: row.id, productId: row.productId, productName: row.product.name, productImageUrl: row.product.imageUrl, rating: row.rating, comment: row.comment ?? "", imageUrls: row.imageUrls, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })), nextCursor: result.nextCursor } };
}

async function readQuestions(userId: string, cursor: string | null): Promise<MyPostsResponse | null> {
  if (cursor) {
    const owned = await prisma.question.findFirst({ where: { id: cursor, userId }, select: { id: true } });
    if (!owned) return null;
  }
  const rows = await prisma.question.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: QUERY_SIZE,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, productId: true, content: true, createdAt: true, updatedAt: true, product: { select: { name: true, imageUrl: true } }, _count: { select: { answers: true } } },
  });
  const result = page(rows);
  return { success: true, data: { items: result.items.map((row) => ({ type: "question", id: row.id, productId: row.productId, productName: row.product.name, productImageUrl: row.product.imageUrl, content: row.content, answerCount: row._count.answers, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })), nextCursor: result.nextCursor } };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const params = new URL(request.url).searchParams;
    const type = parsePostType(params.get("type"));
    if (!type) return invalidRequest();
    const cursor = params.get("cursor");

    let response: MyPostsResponse | null;
    switch (type) {
      case "ootd": response = await readOotd(session.user.id, cursor); break;
      case "review": response = await readReviews(session.user.id, cursor); break;
      case "question": response = await readQuestions(session.user.id, cursor); break;
    }
    return response ? NextResponse.json(response) : invalidRequest();
  } catch (error) {
    console.error("[my posts GET] error:", error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
