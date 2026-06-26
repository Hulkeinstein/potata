import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: mock 참조를 vi.mock 호이스팅보다 먼저 초기화
const {
  authMock,
  hasPurchasedProductMock,
  recomputeProductRatingMock,
  revalidateTagMock,
  revalidatePathMock,
  reviewFindManyMock,
  reviewFindUniqueMock,
  reviewUpsertMock,
  reviewDeleteMock,
  productFindUniqueMock,
  transactionMock,
  uploadMock,
  removeMock,
  isAdminMock,
} = vi.hoisted(() => {
  const reviewUpsertMock = vi.fn();
  const reviewDeleteMock = vi.fn();
  const reviewAggregateMock = vi.fn();
  const productUpdateMock = vi.fn();

  // $transaction: 콜백 실행형 — tx(txMock)를 전달해 콜백을 실제로 호출
  const txMock = {
    review: {
      upsert: reviewUpsertMock,
      delete: reviewDeleteMock,
      aggregate: reviewAggregateMock,
    },
    product: { update: productUpdateMock },
  };

  const transactionMock = vi.fn(async (cb: (tx: typeof txMock) => Promise<unknown>) =>
    cb(txMock),
  );

  return {
    authMock: vi.fn(),
    hasPurchasedProductMock: vi.fn(),
    recomputeProductRatingMock: vi.fn(),
    revalidateTagMock: vi.fn(),
    revalidatePathMock: vi.fn(),
    reviewFindManyMock: vi.fn(),
    reviewFindUniqueMock: vi.fn(),
    reviewUpsertMock,
    reviewDeleteMock,
    productFindUniqueMock: vi.fn(),
    transactionMock,
    uploadMock: vi.fn(),
    removeMock: vi.fn(),
    isAdminMock: vi.fn(),
  };
});

vi.mock("@/auth", () => ({ auth: authMock }));

vi.mock("@/lib/reviews", () => ({
  hasPurchasedProduct: hasPurchasedProductMock,
  recomputeProductRating: recomputeProductRatingMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    review: {
      findMany: reviewFindManyMock,
      findUnique: reviewFindUniqueMock,
      upsert: reviewUpsertMock,
      delete: reviewDeleteMock,
    },
    product: {
      findUnique: productFindUniqueMock,
    },
    $transaction: transactionMock,
  },
}));

vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
  revalidatePath: revalidatePathMock,
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

// supabase-storage mock — 실제 Storage 호출 차단
vi.mock("@/lib/supabase-storage", () => ({
  uploadReviewImage: uploadMock,
  removeReviewImagesByUrl: removeMock,
}));

// admin mock — isAdmin 동기 함수
vi.mock("@/lib/admin", () => ({
  isAdmin: isAdminMock,
}));

// image-validation은 mock하지 않음 — 실제 sniffImage 검증 보존

import { GET, POST, DELETE } from "./route";
import type { NextRequest } from "next/server";

// 공통 params 헬퍼
const makeParams = (id = "p1") =>
  Promise.resolve({ id });

// multipart fake req 헬퍼 (OOTD 선례 — jsdom에서 Request(body:FormData) 불안정)
function postReq(
  fields: Record<string, string>,
  files: File[] = [],
  keepImageUrls: string[] = [],
): NextRequest {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  files.forEach((f) => fd.append("images", f));
  keepImageUrls.forEach((u) => fd.append("keepImageUrls", u));
  return {
    url: "http://localhost/api/products/p1/reviews",
    formData: async () => fd,
  } as unknown as NextRequest;
}

// DELETE용 fake req — body 없음
function makeDeleteReq(): NextRequest {
  return new Request(`http://localhost/api/products/p1/reviews`, {
    method: "DELETE",
  }) as unknown as NextRequest;
}

// GET용 fake req
function makeGetReq(): NextRequest {
  return new Request(`http://localhost/api/products/p1/reviews`, {
    method: "GET",
  }) as unknown as NextRequest;
}

// magic-byte fixture — 실제 JPEG 시그니처 (0xFF 0xD8 0xFF)
function jpgFile(name = "a.jpg"): File {
  return new File(
    [new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])],
    name,
    { type: "image/jpeg" },
  );
}

// 위조 fixture — 0x00 4바이트 → sniff null → 400
function fakeJpgFile(name = "fake.jpg"): File {
  return new File([new Uint8Array([0x00, 0x00, 0x00, 0x00])], name, {
    type: "image/jpeg",
  });
}

// 5MB 초과 파일 — size 검증으로 400 (magic-byte 검사 전)
function bigFile(name = "big.jpg"): File {
  return new File([new Uint8Array(5 * 1024 * 1024 + 1)], name, {
    type: "image/jpeg",
  });
}

// 정상 upsert 결과 fixture
const upsertResult = {
  id: "r1",
  userId: "u1",
  productId: "p1",
  rating: 4,
  comment: "좋아요",
  imageUrls: [] as string[],
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("GET /api/products/[id]/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 케이스 ①: 리뷰 없을 때 빈 목록 + averageRating null
  it("① 빈 목록 → reviews:[], averageRating:null", async () => {
    reviewFindManyMock.mockResolvedValue([]);
    productFindUniqueMock.mockResolvedValue({ rating: null, reviewCount: 0 });

    const res = await GET(makeGetReq(), { params: makeParams() });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.reviews).toEqual([]);
    expect(json.data.averageRating).toBeNull();
  });
});

describe("POST /api/products/[id]/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 기본값: 업로드 성공, admin 아님
    uploadMock.mockResolvedValue({
      path: "p",
      publicUrl: "https://x/review-images/u1/a.jpg",
    });
    removeMock.mockResolvedValue(undefined);
    isAdminMock.mockReturnValue(false);
  });

  // ── 기존 케이스 (multipart 전환) ──

  // 케이스 ②: 비로그인 → 401
  it("② 비로그인 → 401", async () => {
    authMock.mockResolvedValue(null);

    const res = await POST(
      postReq({ rating: "4", comment: "좋음" }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
  });

  // 케이스 ⑪: session.user 있지만 id 없음 → 401
  it("⑪ session.user 있지만 id 없음 → 401", async () => {
    authMock.mockResolvedValue({ user: {} }); // id 없는 세션

    const res = await POST(
      postReq({ rating: "4", comment: "좋음" }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
  });

  // 케이스 ④: rating=6 → 400 (product 존재 확인보다 먼저)
  it("④ rating=6 → 400", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });

    const res = await POST(
      postReq({ rating: "6", comment: "좋음" }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });

  // 케이스 ⑨: comment 2001자 → 400
  it("⑨ comment 2001자 → 400", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(true);

    const res = await POST(
      postReq({ rating: "4", comment: "a".repeat(2001) }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Comment too long (max 2000)");
  });

  // 케이스 ③: 비구매자(일반 유저) → 403
  it("③ 비구매자(일반 유저) → 403", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(false);
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(false);

    const res = await POST(
      postReq({ rating: "4", comment: "좋음" }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
  });

  // 케이스 ⑤: 구매자 정상(이미지 없음) → upsert + recompute + 201
  it("⑤ 구매자 정상 → upsert + recompute 호출 + 201", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(false);
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(true);
    reviewFindUniqueMock.mockResolvedValue(null); // prev: 없음
    reviewUpsertMock.mockResolvedValue({ ...upsertResult });
    recomputeProductRatingMock.mockResolvedValue(undefined);

    const res = await POST(
      postReq({ rating: "4", comment: "좋아요" }),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(reviewUpsertMock).toHaveBeenCalledOnce();
    expect(recomputeProductRatingMock).toHaveBeenCalledOnce();
    expect(revalidatePathMock).toHaveBeenCalledWith("/product/p1");
    expect(revalidateTagMock).toHaveBeenCalledWith("products", {});
  });

  // ── 신규 케이스 ──

  // 신규 (a): 이미지 0장 → 201, uploadMock 미호출, imageUrls 빈
  it("(a) 이미지 0장 → 201, uploadMock 미호출", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(false);
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(true);
    reviewFindUniqueMock.mockResolvedValue(null);
    reviewUpsertMock.mockResolvedValue({ ...upsertResult, imageUrls: [] });
    recomputeProductRatingMock.mockResolvedValue(undefined);

    const res = await POST(
      postReq({ rating: "5", comment: "good" }, []),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  // 신규 (b): jpg 3장 → 201, uploadMock 3회 호출
  it("(b) jpg 3장 → 201, uploadMock 3회 호출", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(false);
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(true);
    reviewFindUniqueMock.mockResolvedValue(null);
    uploadMock
      .mockResolvedValueOnce({ publicUrl: "https://x/1.jpg" })
      .mockResolvedValueOnce({ publicUrl: "https://x/2.jpg" })
      .mockResolvedValueOnce({ publicUrl: "https://x/3.jpg" });
    reviewUpsertMock.mockResolvedValue({
      ...upsertResult,
      imageUrls: ["https://x/1.jpg", "https://x/2.jpg", "https://x/3.jpg"],
    });
    recomputeProductRatingMock.mockResolvedValue(undefined);

    const res = await POST(
      postReq(
        { rating: "4", comment: "images" },
        [jpgFile("a.jpg"), jpgFile("b.jpg"), jpgFile("c.jpg")],
      ),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(uploadMock).toHaveBeenCalledTimes(3);
  });

  // 신규 (c): 4장 → 400, 업로드 미호출
  it("(c) 이미지 4장 → 400, 업로드 미호출", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(false);
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(true);
    reviewFindUniqueMock.mockResolvedValue(null);

    const res = await POST(
      postReq(
        { rating: "4", comment: "too many" },
        [jpgFile("a.jpg"), jpgFile("b.jpg"), jpgFile("c.jpg"), jpgFile("d.jpg")],
      ),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  // 신규 (d): per-file 5MB 초과 → 400
  it("(d) 5MB 초과 파일 → 400", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(false);
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(true);
    reviewFindUniqueMock.mockResolvedValue(null);

    const res = await POST(
      postReq({ rating: "4", comment: "big" }, [bigFile()]),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  // 신규 (e): magic-byte 위조(0x00 4바이트) → sniff null → 400
  it("(e) magic-byte 위조 파일 → 400", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(false);
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(true);
    reviewFindUniqueMock.mockResolvedValue(null);

    const res = await POST(
      postReq({ rating: "4", comment: "fake" }, [fakeJpgFile()]),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  // 신규 (f): admin 미구매 → isAdmin true, hasPurchased false → 201 (admin 우회)
  it("(f) admin 미구매 → 201 (admin 우회)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "admin@potata.com" } });
    isAdminMock.mockReturnValue(true); // admin 우회
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(false); // 구매 안 함
    reviewFindUniqueMock.mockResolvedValue(null);
    reviewUpsertMock.mockResolvedValue({ ...upsertResult });
    recomputeProductRatingMock.mockResolvedValue(undefined);

    const res = await POST(
      postReq({ rating: "5", comment: "admin review" }, []),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    // hasPurchasedProduct는 호출되지 않아야 함 (admin 우회로 단락 평가)
    expect(hasPurchasedProductMock).not.toHaveBeenCalled();
  });

  // 신규 (g): 일반 유저 미구매 → 403 (명시적 확인)
  it("(g) 일반 유저 미구매 → 403", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "user@example.com" } });
    isAdminMock.mockReturnValue(false);
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(false);

    const res = await POST(
      postReq({ rating: "4", comment: "no purchase" }, []),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
  });

  // 신규 (h): 수정 차집합 — prev imageUrls=["old.jpg"] → 새 이미지 제출 → removeMock(차집합) 호출
  it("(h) 수정 시 prev 이미지 차집합 삭제", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(false);
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(true);
    // prev: 기존에 "old.jpg" 이미지 있었음
    reviewFindUniqueMock.mockResolvedValue({ imageUrls: ["https://x/old.jpg"] });
    uploadMock.mockResolvedValueOnce({ publicUrl: "https://x/new.jpg" });
    reviewUpsertMock.mockResolvedValue({
      ...upsertResult,
      imageUrls: ["https://x/new.jpg"],
    });
    recomputeProductRatingMock.mockResolvedValue(undefined);

    const res = await POST(
      postReq({ rating: "5", comment: "updated" }, [jpgFile("new.jpg")]),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    // 차집합 삭제: old.jpg가 new 목록에 없으므로 removeMock 호출
    expect(removeMock).toHaveBeenCalledWith(["https://x/old.jpg"]);
  });

  // 신규 (k): 수정 + keepImageUrls=기존 전체 + 새 파일 0 → 기존 imageUrls 보존, removeMock 미호출
  it("(k) 수정 + keepImageUrls=기존 전체 + 새 파일 0 → 기존 imageUrls 보존, removeMock 미호출", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(false);
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(true);
    // prev: 기존 이미지 있음
    reviewFindUniqueMock.mockResolvedValue({ imageUrls: ["https://x/keep.jpg"] });
    reviewUpsertMock.mockResolvedValue({
      ...upsertResult,
      imageUrls: ["https://x/keep.jpg"],
    });
    recomputeProductRatingMock.mockResolvedValue(undefined);

    const res = await POST(
      // keepImageUrls=기존 전체 전송 → kept=["https://x/keep.jpg"], removed=[]
      postReq({ rating: "4", comment: "no new images" }, [], ["https://x/keep.jpg"]),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    // 업로드 미호출 (새 파일 0장)
    expect(uploadMock).not.toHaveBeenCalled();
    // removeMock 미호출 — kept=기존 전체이므로 removed=[]
    expect(removeMock).not.toHaveBeenCalledWith(["https://x/keep.jpg"]);
    // upsert update.imageUrls = 기존 값 유지
    expect(reviewUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          imageUrls: ["https://x/keep.jpg"],
        }),
      }),
    );
  });

  // 신규 (i): DB $transaction 실패 → removeMock(uploaded 보상) 호출 + 500
  it("(i) DB 트랜잭션 실패 → 업로드 보상 삭제 + 500", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(false);
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(true);
    reviewFindUniqueMock.mockResolvedValue(null);
    uploadMock.mockResolvedValueOnce({ publicUrl: "https://x/uploaded.jpg" });
    // $transaction 실패 — non-Prisma error로 500 트리거
    transactionMock.mockRejectedValueOnce(new Error("DB 연결 오류"));

    const res = await POST(
      postReq({ rating: "4", comment: "fail" }, [jpgFile()]),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    // 업로드된 이미지 보상 삭제 확인
    expect(removeMock).toHaveBeenCalledWith(["https://x/uploaded.jpg"]);
  });

  // 신규 (l): 수정 + keepImageUrls=일부(기존 2장 중 1장) + 새 파일 0 → 최종=keep 1장, removeMock(제거된 1장) 호출
  it("(l) 수정 + keepImageUrls=일부(1장만 keep) → 최종 1장, 제거분 removeMock 호출", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(false);
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(true);
    // prev: 기존 2장
    reviewFindUniqueMock.mockResolvedValue({
      imageUrls: ["https://x/img1.jpg", "https://x/img2.jpg"],
    });
    reviewUpsertMock.mockResolvedValue({
      ...upsertResult,
      imageUrls: ["https://x/img1.jpg"],
    });
    recomputeProductRatingMock.mockResolvedValue(undefined);

    const res = await POST(
      // 기존 2장 중 img1만 keep, img2는 제거 → new 파일 없음
      postReq({ rating: "4", comment: "partial keep" }, [], ["https://x/img1.jpg"]),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    // 업로드 미호출 (새 파일 없음)
    expect(uploadMock).not.toHaveBeenCalled();
    // upsert imageUrls = keep 1장만
    expect(reviewUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          imageUrls: ["https://x/img1.jpg"],
        }),
      }),
    );
    // removed = img2 (keep 안 된 것) → Storage 삭제
    expect(removeMock).toHaveBeenCalledWith(["https://x/img2.jpg"]);
  });

  // 신규 (m): keepImageUrls에 본인 것 아닌 임의 URL 포함 → 필터되어 무시(저장 안 됨, 보안)
  it("(m) keepImageUrls에 임의 URL → 보안 필터로 무시, finalImageUrls에 미포함", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(false);
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(true);
    // prev: 기존 1장
    reviewFindUniqueMock.mockResolvedValue({ imageUrls: ["https://x/mine.jpg"] });
    reviewUpsertMock.mockResolvedValue({
      ...upsertResult,
      imageUrls: ["https://x/mine.jpg"],
    });
    recomputeProductRatingMock.mockResolvedValue(undefined);

    const res = await POST(
      // mine.jpg(본인) + 임의 URL(타인/악의적) 전송
      postReq({ rating: "4", comment: "injection" }, [], [
        "https://x/mine.jpg",
        "https://evil.com/other-file.jpg", // 본인 prevUrls에 없음 → 필터
      ]),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    // 임의 URL은 필터되어 upsert imageUrls에 미포함
    expect(reviewUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          imageUrls: ["https://x/mine.jpg"], // 본인 것만
        }),
      }),
    );
  });

  // 신규 (m2): keepImageUrls에 같은 URL 중복 → dedup 적용, upsert imageUrls에 1번만 포함
  it("(m2) keepImageUrls 중복 URL → dedup 적용, finalImageUrls에 1번만", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(false);
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(true);
    // prev: urlA 1장
    reviewFindUniqueMock.mockResolvedValue({ imageUrls: ["https://x/img-a.jpg"] });
    reviewUpsertMock.mockResolvedValue({
      ...upsertResult,
      imageUrls: ["https://x/img-a.jpg"],
    });
    recomputeProductRatingMock.mockResolvedValue(undefined);

    const res = await POST(
      // keepImageUrls에 urlA를 2번 전송 (중복)
      postReq({ rating: "4", comment: "dedup" }, [], [
        "https://x/img-a.jpg",
        "https://x/img-a.jpg",
      ]),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    // dedup → upsert imageUrls에 urlA 1번만
    expect(reviewUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          imageUrls: ["https://x/img-a.jpg"],
        }),
      }),
    );
  });

  // 신규 (n): keep 2 + 새 파일 2 = 총 4장 → 400(총 개수 초과)
  it("(n) keep 2 + 새 파일 2 = 총 4장 → 400(총 개수 초과)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(false);
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(true);
    reviewFindUniqueMock.mockResolvedValue(null);

    const res = await POST(
      postReq(
        { rating: "4", comment: "too many total" },
        [jpgFile("new1.jpg"), jpgFile("new2.jpg")],
        ["https://x/keep1.jpg", "https://x/keep2.jpg"],
      ),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe(`이미지는 최대 ${3}장`);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  // 신규 (o): 신규 리뷰(prev 없음) + 새 파일 2 → finalImageUrls=업로드 2, kept=[]
  it("(o) 신규 리뷰 + 새 파일 2 → finalImageUrls=업로드 2", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    isAdminMock.mockReturnValue(false);
    productFindUniqueMock.mockResolvedValue({ id: "p1" });
    hasPurchasedProductMock.mockResolvedValue(true);
    reviewFindUniqueMock.mockResolvedValue(null); // prev 없음
    uploadMock
      .mockResolvedValueOnce({ publicUrl: "https://x/new1.jpg" })
      .mockResolvedValueOnce({ publicUrl: "https://x/new2.jpg" });
    reviewUpsertMock.mockResolvedValue({
      ...upsertResult,
      imageUrls: ["https://x/new1.jpg", "https://x/new2.jpg"],
    });
    recomputeProductRatingMock.mockResolvedValue(undefined);

    const res = await POST(
      // 신규 리뷰 — keepImageUrls 없음 (또는 빈 배열)
      postReq(
        { rating: "5", comment: "brand new" },
        [jpgFile("new1.jpg"), jpgFile("new2.jpg")],
        [], // keepImageUrls 없음
      ),
      { params: makeParams() },
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(uploadMock).toHaveBeenCalledTimes(2);
    // create.imageUrls = uploaded 2장 (kept=[] → finalImageUrls=uploaded)
    expect(reviewUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          imageUrls: ["https://x/new1.jpg", "https://x/new2.jpg"],
        }),
      }),
    );
    // removed=[] — removeMock 호출 안 됨
    expect(removeMock).not.toHaveBeenCalledWith(expect.arrayContaining(["https://x"]));
  });
});

describe("DELETE /api/products/[id]/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    removeMock.mockResolvedValue(undefined);
  });

  // 케이스 ⑥: 본인 리뷰 없음 → 404
  it("⑥ 본인 리뷰 없음 → 404", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    reviewFindUniqueMock.mockResolvedValue(null);

    const res = await DELETE(makeDeleteReq(), { params: makeParams() });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
  });

  // 케이스 ⑦: 본인 리뷰 삭제 → delete + recompute + 200 (이미지 없는 경우)
  it("⑦ 본인 리뷰 삭제(이미지 없음) → delete + recompute + 200", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    reviewFindUniqueMock.mockResolvedValue({ id: "r1", imageUrls: [] });
    reviewDeleteMock.mockResolvedValue(undefined);
    recomputeProductRatingMock.mockResolvedValue(undefined);

    const res = await DELETE(makeDeleteReq(), { params: makeParams() });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(reviewDeleteMock).toHaveBeenCalledOnce();
    expect(recomputeProductRatingMock).toHaveBeenCalledOnce();
    expect(revalidatePathMock).toHaveBeenCalledWith("/product/p1");
    expect(revalidateTagMock).toHaveBeenCalledWith("products", {});
  });

  // 신규 (j): DELETE 이미지 있는 리뷰 → removeMock 호출 + 200
  it("(j) DELETE 이미지 있는 리뷰 → Storage 정리 + 200", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    reviewFindUniqueMock.mockResolvedValue({
      id: "r1",
      imageUrls: ["https://x/u.jpg"],
    });
    reviewDeleteMock.mockResolvedValue(undefined);
    recomputeProductRatingMock.mockResolvedValue(undefined);

    const res = await DELETE(makeDeleteReq(), { params: makeParams() });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    // Storage 이미지 전량 정리 확인
    expect(removeMock).toHaveBeenCalledWith(["https://x/u.jpg"]);
  });
});
