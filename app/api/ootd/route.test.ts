import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, postCreate, postFindMany, uploadMock, removeMock, getProductByIdMock } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    postCreate: vi.fn(),
    postFindMany: vi.fn(),
    uploadMock: vi.fn(),
    removeMock: vi.fn(),
    getProductByIdMock: vi.fn(),
  }));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: { oOTDPost: { create: postCreate, findMany: postFindMany } },
}));
vi.mock("@/lib/supabase-storage", () => ({
  uploadOOTDImage: uploadMock,
  removeOOTDImagesByUrl: removeMock,
  publicUrlToPath: vi.fn(),
}));
vi.mock("@/lib/products", () => ({ getProductById: getProductByIdMock }));

import { POST, GET } from "./route";
import type { NextRequest } from "next/server";

function jpeg(name = "a.jpg", size = 1000): File {
  return new File([new Uint8Array(size)], name, { type: "image/jpeg" });
}
// 라우트는 req.formData()만 호출하므로, 멀티파트 round-trip 대신 formData()를 가진 fake req로 주입
// (jsdom 환경에서 Request(body: FormData) → formData() 파싱이 불안정하므로 안정적인 방식)
function postReq(files: File[], fields: Record<string, string | string[]> = {}): NextRequest {
  const fd = new FormData();
  for (const f of files) fd.append("images", f);
  for (const [k, v] of Object.entries(fields)) {
    (Array.isArray(v) ? v : [v]).forEach((val) => fd.append(k, val));
  }
  return { url: "http://localhost/api/ootd", formData: async () => fd } as unknown as NextRequest;
}
function getReq(cursor?: string): NextRequest {
  const u = new URL("http://localhost/api/ootd");
  if (cursor) u.searchParams.set("cursor", cursor);
  return new Request(u) as unknown as NextRequest;
}

interface FeedJson {
  data: {
    items: Array<{
      likeCount: number;
      isLiked: boolean;
      author: { name: string };
      products: Array<{ id: string; name: string; brand: string; imageUrl: string }>;
    }>;
    nextCursor: string | null;
  };
}

describe("POST /api/ootd", () => {
  beforeEach(() => vi.clearAllMocks());

  it("미인증은 401, 업로드 미호출", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(postReq([jpeg()]));
    expect(res.status).toBe(401);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("이미지 0장은 400", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(postReq([]));
    expect(res.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("허용 안 된 형식(gif)은 400, 업로드 미호출", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    const gif = new File([new Uint8Array(10)], "a.gif", { type: "image/gif" });
    const res = await POST(postReq([gif]));
    expect(res.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("5MB 초과는 400", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(postReq([jpeg("big.jpg", 5 * 1024 * 1024 + 1)]));
    expect(res.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("존재하지 않는 태그 상품은 400(업로드 전 차단)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    getProductByIdMock.mockResolvedValue(null);
    const res = await POST(postReq([jpeg()], { productIds: "999" }));
    expect(res.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("정상: 여러 장 업로드 후 post 생성 200", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    getProductByIdMock.mockResolvedValue({ id: "1" });
    uploadMock
      .mockResolvedValueOnce({ path: "u1/a.jpg", publicUrl: "https://x/p/a.jpg" })
      .mockResolvedValueOnce({ path: "u1/b.jpg", publicUrl: "https://x/p/b.jpg" });
    postCreate.mockResolvedValue({ id: "post1" });

    const res = await POST(postReq([jpeg("a.jpg"), jpeg("b.jpg")], { caption: "fit", productIds: "1" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { id: string } };
    expect(json.data.id).toBe("post1");
    expect(uploadMock).toHaveBeenCalledTimes(2);
    const arg = postCreate.mock.calls[0][0] as { data: { imageUrls: string[] } };
    expect(arg.data.imageUrls).toEqual(["https://x/p/a.jpg", "https://x/p/b.jpg"]);
  });

  it("DB 생성 실패 시 업로드분 보상 삭제 + 500", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    uploadMock.mockResolvedValue({ path: "u1/a.jpg", publicUrl: "https://x/p/a.jpg" });
    postCreate.mockRejectedValue(new Error("db down"));
    removeMock.mockResolvedValue(undefined);

    const res = await POST(postReq([jpeg()]));
    expect(res.status).toBe(500);
    expect(removeMock).toHaveBeenCalledWith(["https://x/p/a.jpg"]);
  });
});

describe("GET /api/ootd", () => {
  beforeEach(() => vi.clearAllMocks());

  it("미인증은 401", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET(getReq());
    expect(res.status).toBe(401);
  });

  it("피드 매핑: likeCount/isLiked/author/products(Pick)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    postFindMany.mockResolvedValue([
      {
        id: "p1",
        imageUrls: ["i1"],
        caption: "c",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        user: { id: "u2", name: "B", avatar: null },
        products: [{ product: { id: "1", name: "N", brand: "Br", imageUrl: "img", description: "x" } }],
        likes: [{ id: "l1" }],
        _count: { likes: 3 },
      },
    ]);
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const json = (await res.json()) as FeedJson;
    expect(json.data.items).toHaveLength(1);
    expect(json.data.items[0].likeCount).toBe(3);
    expect(json.data.items[0].isLiked).toBe(true);
    expect(json.data.items[0].author.name).toBe("B");
    expect(json.data.items[0].products[0]).toEqual({ id: "1", name: "N", brand: "Br", imageUrl: "img" });
    expect(json.data.nextCursor).toBeNull(); // 1개 < FEED_TAKE
  });
});
