import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: mock 참조를 vi.mock 호이스팅보다 먼저 초기화
const { authMock, isAdminMock, createProductMock, uploadMock, removeMock, revalidateTagMock } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    isAdminMock: vi.fn(),
    createProductMock: vi.fn(),
    uploadMock: vi.fn(),
    removeMock: vi.fn(),
    revalidateTagMock: vi.fn(),
  }));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/admin", () => ({ isAdmin: isAdminMock }));
// createProduct만 mock — unstable_cache는 route.test에서 lib/products를 직접 임포트하지 않으므로 영향 없음
vi.mock("@/lib/products", () => ({ createProduct: createProductMock }));
vi.mock("@/lib/supabase-storage", () => ({
  uploadProductImage: uploadMock,
  removeProductImagesByUrl: removeMock,
}));
// revalidateTag + unstable_cache 모두 포함(lib/products가 간접 사용할 수 있으므로 안전하게 스텁)
vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

import { POST } from "./route";
import type { NextRequest } from "next/server";

// JPEG magic bytes (FF D8 FF E0 + 패딩)
const JPEG_MAGIC = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

/**
 * 유효한 JPEG 파일 헬퍼 — magic-byte 검사를 통과하는 진짜 헤더를 사용.
 * 크기 지정 시 JPEG_MAGIC 이후를 0x00으로 패딩해 원하는 총 크기 충족.
 */
function jpeg(name = "test.jpg", size = 1000): File {
  if (size <= JPEG_MAGIC.length) {
    return new File([JPEG_MAGIC], name, { type: "image/jpeg" });
  }
  const buf = new Uint8Array(size);
  buf.set(JPEG_MAGIC);
  return new File([buf], name, { type: "image/jpeg" });
}

// FormData 기반 fake Request 헬퍼 (ootd 패턴 — jsdom 환경 안정성)
// fields 값이 string[]인 경우 다중 append — tags 등 getAll() 기반 필드 지원
function adminPostReq(
  fields: Record<string, string | string[]>,
  imageFile?: File
): NextRequest {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) {
      for (const item of v) {
        fd.append(k, item);
      }
    } else {
      fd.append(k, v);
    }
  }
  if (imageFile) {
    fd.append("image", imageFile);
  }
  return {
    url: "http://localhost/api/admin/products",
    formData: async () => fd,
  } as unknown as NextRequest;
}

// 유효한 폼 필드(기본값)
const VALID_FIELDS = {
  name: "테스트 상품",
  brand: "TestBrand",
  price: "100",
  category: "Top",
};

describe("POST /api/admin/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 기본 mock 반환값 설정
    authMock.mockResolvedValue({ user: { id: "admin-1", email: "admin@test.com" } });
    isAdminMock.mockReturnValue(true);
    uploadMock.mockResolvedValue({ path: "products/abc.jpg", publicUrl: "https://storage.example.com/products/abc.jpg" });
    createProductMock.mockResolvedValue({ id: "new-id", name: "테스트 상품" });
    removeMock.mockResolvedValue(undefined);
  });

  // ─── 인증 게이트 ───────────────────────────────────────────────────────────

  it("미인증(세션 없음)은 401, 업로드 미호출", async () => {
    authMock.mockResolvedValue(null);
    const req = adminPostReq(VALID_FIELDS, jpeg());
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("비admin 계정은 403, 업로드 미호출", async () => {
    isAdminMock.mockReturnValue(false);
    const req = adminPostReq(VALID_FIELDS, jpeg());
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  // ─── 필드 검증 (업로드 前 차단) ────────────────────────────────────────────

  it("이미지 미첨부 시 400, 업로드 미호출", async () => {
    const req = adminPostReq(VALID_FIELDS); // image 없음
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("Size Guide가 상품 사이즈와 일치하지 않으면 업로드 전에 400", async () => {
    const sizeGuide = JSON.stringify({ version: 1, measurementType: "garment", unit: "cm", columns: [{ key: "chest", label: "가슴" }], rows: [{ size: "M", measurements: { chest: 55 } }] });
    const req = adminPostReq({ ...VALID_FIELDS, sizes: "S, M", sizeGuide }, jpeg());
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("유효한 Size Guide를 검증된 객체로 createProduct에 전달한다", async () => {
    const sizeGuide = JSON.stringify({ version: 1, measurementType: "garment", unit: "cm", columns: [{ key: "chest", label: "가슴" }], rows: [{ size: "M", measurements: { chest: 55 } }] });
    const req = adminPostReq({ ...VALID_FIELDS, sizes: "M", sizeGuide }, jpeg());
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(createProductMock).toHaveBeenCalledWith(expect.objectContaining({ sizeGuide: expect.objectContaining({ version: 1, measurementType: "garment" }) }));
  });

  it("name 빈값은 400, 업로드 미호출", async () => {
    const req = adminPostReq({ ...VALID_FIELDS, name: "" }, jpeg());
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("brand 빈값은 400, 업로드 미호출", async () => {
    const req = adminPostReq({ ...VALID_FIELDS, brand: "" }, jpeg());
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("price=0은 400(0보다 큰 정수 필요), 업로드 미호출", async () => {
    const req = adminPostReq({ ...VALID_FIELDS, price: "0" }, jpeg());
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("price=-5는 400(음수 불가), 업로드 미호출", async () => {
    const req = adminPostReq({ ...VALID_FIELDS, price: "-5" }, jpeg());
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("price='abc'는 400(비정수), 업로드 미호출", async () => {
    const req = adminPostReq({ ...VALID_FIELDS, price: "abc" }, jpeg());
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("category='All'은 400(저장 금지 카테고리), 업로드 미호출", async () => {
    const req = adminPostReq({ ...VALID_FIELDS, category: "All" }, jpeg());
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("category 빈값은 400, 업로드 미호출", async () => {
    const req = adminPostReq({ ...VALID_FIELDS, category: "" }, jpeg());
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("이미지 MIME=image/gif는 400, 업로드 미호출", async () => {
    const gif = new File([new Uint8Array(100)], "test.gif", { type: "image/gif" });
    const req = adminPostReq(VALID_FIELDS, gif);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("이미지 크기 5MB 초과는 400, 업로드 미호출", async () => {
    // 5MB + 1 byte 파일 — size 검사가 sniff보다 앞에 있으므로 magic 없이도 400
    const bigFile = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.jpg", {
      type: "image/jpeg",
    });
    const req = adminPostReq(VALID_FIELDS, bigFile);
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("magic-byte 불일치: type=image/png인데 바이트가 png 형식 아닐 때 400, 업로드 미호출", async () => {
    // type은 png를 선언하지만 바이트는 임의값 → sniff가 null 반환 → 400
    const fakePng = new File([new Uint8Array([1, 2, 3, 4, 5])], "fake.png", {
      type: "image/png",
    });
    const req = adminPostReq(VALID_FIELDS, fakePng);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("magic-byte 불일치: type=image/jpeg인데 png magic bytes → 400, 업로드 미호출", async () => {
    // MIME은 jpeg이지만 실제 바이트는 PNG magic → ext 불일치
    const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const mismatch = new File([PNG_MAGIC], "trick.jpg", { type: "image/jpeg" });
    const req = adminPostReq(VALID_FIELDS, mismatch);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  // ─── Happy Path ─────────────────────────────────────────────────────────────

  it("유효 폼: 200, uploadProductImage 1회 + createProduct 1회 호출, data.id 반환", async () => {
    const req = adminPostReq(VALID_FIELDS, jpeg());
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe("new-id");
    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(createProductMock).toHaveBeenCalledTimes(1);
  });

  it("createProduct에 올바른 필드(name/brand/price/category/imageUrl) 전달", async () => {
    const req = adminPostReq(
      { name: "셔츠", brand: "Nike", price: "29900", category: "Top" },
      jpeg()
    );
    await POST(req);
    const callArg = createProductMock.mock.calls[0][0] as {
      name: string;
      brand: string;
      price: number;
      category: string;
      imageUrl: string;
    };
    expect(callArg.name).toBe("셔츠");
    expect(callArg.brand).toBe("Nike");
    expect(callArg.price).toBe(29900);
    expect(callArg.category).toBe("Top");
    expect(callArg.imageUrl).toBe("https://storage.example.com/products/abc.jpg");
  });

  // ─── tags 다중 append ────────────────────────────────────────────────────────

  it("tags 3개 다중 append → createProduct 인자 tags 길이 3(콤마 합산 아님)", async () => {
    // FormData 비대칭 silent-bug 방어: tags.join(',')으로 1개로 합쳐지지 않고 개별 3개로 전달되어야 함
    const req = adminPostReq(
      { ...VALID_FIELDS, tags: ["데님", "자켓", "가을"] },
      jpeg()
    );
    await POST(req);
    expect(createProductMock).toHaveBeenCalledTimes(1);
    const callArg = createProductMock.mock.calls[0][0] as { tags: string[] };
    expect(callArg.tags).toHaveLength(3);
    expect(callArg.tags).toEqual(["데님", "자켓", "가을"]);
  });

  it("tags 미전송 → createProduct 인자 tags = []", async () => {
    // tags 필드 없이 전송 → getAll('tags')=[]] → 빈 배열 전달
    const req = adminPostReq(VALID_FIELDS, jpeg());
    await POST(req);
    const callArg = createProductMock.mock.calls[0][0] as { tags: string[] };
    expect(callArg.tags).toEqual([]);
  });

  // ─── 보상 (Compensation) ─────────────────────────────────────────────────────

  it("createProduct 실패 시 removeProductImagesByUrl 호출 + 500", async () => {
    uploadMock.mockResolvedValue({
      path: "products/abc.jpg",
      publicUrl: "https://x/p.png",
    });
    createProductMock.mockRejectedValue(new Error("DB 연결 실패"));

    const req = adminPostReq(VALID_FIELDS, jpeg());
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("상품 등록 중 오류가 발생했습니다.");
    expect(json.error).not.toContain("DB 연결 실패");
    // 고아 파일 방지 — 업로드된 URL로 보상 삭제 호출 확인
    expect(removeMock).toHaveBeenCalledWith(["https://x/p.png"]);
  });

  it("보상 삭제 자체가 실패해도 여전히 500 반환(보상 실패 무시)", async () => {
    uploadMock.mockResolvedValue({
      path: "products/abc.jpg",
      publicUrl: "https://x/p.png",
    });
    createProductMock.mockRejectedValue(new Error("DB down"));
    removeMock.mockRejectedValue(new Error("Storage도 실패"));

    const req = adminPostReq(VALID_FIELDS, jpeg());
    const res = await POST(req);
    // 보상 실패는 삼켜지므로 라우트는 500만 반환해야 함
    expect(res.status).toBe(500);
  });

  // ─── 교차검증 (MED-2) ──────────────────────────────────────────────────────

  it("discountRate=150(>100)은 400, 업로드 미호출", async () => {
    const req = adminPostReq({ ...VALID_FIELDS, discountRate: "150" }, jpeg());
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("originalPrice < price(price=100, originalPrice=50)는 400, 업로드 미호출", async () => {
    const req = adminPostReq(
      { ...VALID_FIELDS, price: "100", originalPrice: "50" },
      jpeg()
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  // ─── revalidateTag 단언 ────────────────────────────────────────────────────

  it("성공 시 revalidateTag('products') 1회 호출", async () => {
    const req = adminPostReq(VALID_FIELDS, jpeg());
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(revalidateTagMock).toHaveBeenCalledTimes(1);
    // Next.js 16+에서 revalidateTag 두 번째 인자 필수 — 빈 profile({})로 호출
    expect(revalidateTagMock).toHaveBeenCalledWith("products", {});
  });
});
