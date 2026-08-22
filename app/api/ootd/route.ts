import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProductById } from "@/lib/products";
import { extractErrorMessage } from "@/lib/auth";
import { uploadOOTDImage, removeOOTDImagesByUrl } from "@/lib/supabase-storage";
import type { OOTDFeedData, OOTDFeedItem } from "@/types";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 5;
const FEED_TAKE = 12;

// POST: OOTD 게시 — 파일 검증 → Storage 업로드(여러 장) → 태그와 함께 DB 생성(실패 시 보상 삭제)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const form = await req.formData();
    const files = form.getAll("images").filter((f): f is File => f instanceof File);
    const captionRaw = form.get("caption");
    const caption = typeof captionRaw === "string" && captionRaw.trim() ? captionRaw.trim() : null;
    const productIds = [
      ...new Set(form.getAll("productIds").map((v) => String(v)).filter((v) => v.length > 0)),
    ];

    // 1. 파일 검증 (Zero Trust — Storage 호출 전)
    if (files.length < 1 || files.length > MAX_IMAGES) {
      return NextResponse.json(
        { success: false, error: `이미지는 1~${MAX_IMAGES}장이어야 합니다.` },
        { status: 400 }
      );
    }
    for (const f of files) {
      if (!(f.type in ALLOWED_TYPES)) {
        return NextResponse.json(
          { success: false, error: "jpg/png/webp 이미지만 업로드할 수 있습니다." },
          { status: 400 }
        );
      }
      if (f.size > MAX_SIZE) {
        return NextResponse.json(
          { success: false, error: "이미지는 5MB 이하여야 합니다." },
          { status: 400 }
        );
      }
    }

    // 2. 태그 상품 FK 선검증 (업로드 전 — 실패 시 업로드 낭비/보상 불필요)
    for (const pid of productIds) {
      const product = await getProductById(pid);
      if (!product) {
        return NextResponse.json(
          { success: false, error: "존재하지 않는 상품이 태그에 포함됐습니다." },
          { status: 400 }
        );
      }
    }

    // 3. Storage 업로드 (여러 장)
    const imageUrls: string[] = [];
    for (const f of files) {
      const ext = ALLOWED_TYPES[f.type];
      const data = await f.arrayBuffer();
      const { publicUrl } = await uploadOOTDImage(userId, { data, contentType: f.type, ext });
      imageUrls.push(publicUrl);
    }

    // 4. DB 생성 — 실패 시 업로드분 보상 삭제 후 re-throw(최상위 catch가 500)
    try {
      const post = await prisma.oOTDPost.create({
        data: {
          userId,
          imageUrls,
          caption,
          products: { create: productIds.map((productId) => ({ productId })) },
        },
        select: { id: true },
      });
      return NextResponse.json({ success: true, data: { id: post.id } }, { status: 200 });
    } catch (dbErr) {
      await removeOOTDImagesByUrl(imageUrls).catch(() => {}); // 고아 파일 방지(보상)
      throw dbErr;
    }
  } catch (error) {
    console.error("[ootd POST] error:", error);
    return NextResponse.json({ success: false, error: extractErrorMessage(error) }, { status: 500 });
  }
}

// GET: 피드 — cursor pagination 최신순 + likeCount + isLiked + 작성자 + 태그 상품
// tab=all(기본): 비로그인 공개. tab=following: 인증 필수 + 팔로잉 유저 게시물만.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") === "following" ? "following" : "all";
    const cursor = searchParams.get("cursor");

    const session = await auth();
    const userId = session?.user?.id ?? null;

    // tab=following은 인증 필수(tab=all은 비로그인 공개)
    if (tab === "following" && !userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 팔로잉 필터: 내가 팔로우하는 유저(followers.some.followerId=나) 게시물만
    const whereClause =
      tab === "following"
        ? { user: { followers: { some: { followerId: userId! } } } }
        : {};

    const posts = await prisma.oOTDPost.findMany({
      take: FEED_TAKE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, handle: true, avatar: true } },
        products: { include: { product: true } },
        // 비로그인(userId=null) 시 "__none__"으로 빈 배열 보장 → isLiked false
        likes: { where: { userId: userId ?? "__none__" }, select: { id: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    const items: OOTDFeedItem[] = posts.map((p) => ({
      id: p.id,
      imageUrls: p.imageUrls,
      caption: p.caption,
      createdAt: p.createdAt.toISOString(),
      author: { id: p.user.id, name: p.user.name, handle: p.user.handle, avatar: p.user.avatar },
      products: p.products.map((op) => ({
        id: op.product.id,
        name: op.product.name,
        brand: op.product.brand,
        imageUrl: op.product.imageUrl,
      })),
      likeCount: p._count.likes,
      commentCount: p._count.comments,
      isLiked: p.likes.length > 0,
    }));

    const nextCursor = posts.length === FEED_TAKE ? posts[posts.length - 1].id : null;
    const data: OOTDFeedData = { items, nextCursor };
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("[ootd GET] error:", error);
    return NextResponse.json({ success: false, error: extractErrorMessage(error) }, { status: 500 });
  }
}
