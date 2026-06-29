import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { createProduct } from "@/lib/products";
import { uploadProductImage, removeProductImagesByUrl } from "@/lib/supabase-storage";
import { extractErrorMessage } from "@/lib/auth";
import type { CreateProductInput, AdminProductCreateData } from "@/types";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
// DB에 저장 가능한 실제 카테고리 6종('All'은 필터 전용 — 저장 금지)
const VALID_CATEGORIES = ["Outer", "Top", "Bottom", "Dress", "Acc", "Shoes"];

/**
 * 파일 앞 바이트(magic number)로 실제 이미지 형식 확인.
 * 클라이언트 제공 MIME(Content-Type)만 신뢰하지 않고 바이트 수준에서 검증(공개 버킷 — defense-in-depth).
 */
function sniffImage(buf: ArrayBuffer): "jpg" | "png" | "webp" | null {
  const b = new Uint8Array(buf);
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) return "png";
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return "webp";
  return null;
}

// POST: 관리자 상품 등록 — admin 게이트 → 검증 → Storage 업로드 → DB 생성 → 보상(실패 시)
export async function POST(req: NextRequest) {
  try {
    // 1. 인증 게이트 — 세션만 신뢰(요청 body의 user 정보 신뢰 금지)
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(session.user.email)) {
      return NextResponse.json(
        { success: false, error: "관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

    // 2. 폼 데이터 파싱
    const form = await req.formData();

    const name = String(form.get("name") ?? "").trim();
    const brand = String(form.get("brand") ?? "").trim();
    const priceRaw = String(form.get("price") ?? "");
    const price = Number.parseInt(priceRaw, 10);
    const category = String(form.get("category") ?? "").trim();
    const image = form.get("image");

    // 선택 필드
    const originalPriceRaw = String(form.get("originalPrice") ?? "").trim();
    const discountRateRaw = String(form.get("discountRate") ?? "").trim();
    const description = String(form.get("description") ?? "").trim() || undefined;

    // 콤마 구분 배열(빈값 필터)
    const sizesRaw = String(form.get("sizes") ?? "").trim();
    const sizes = sizesRaw
      ? sizesRaw.split(",").map((s) => s.trim()).filter((s) => s.length > 0)
      : undefined;

    const colorsRaw = String(form.get("colors") ?? "").trim();
    const colors = colorsRaw
      ? colorsRaw.split(",").map((c) => c.trim()).filter((c) => c.length > 0)
      : undefined;

    // 태그 칩은 다중 append(form.getAll) — sizes/colors의 단일 콤마 split과 다른 경로.
    // Zero Trust 서버 가드: trim·빈값제거·각 20자 이하·중복제거·최대 10개(클라 가드 우회 방어).
    const tags = Array.from(
      new Set(
        form.getAll("tags")
          .map(String)
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && s.length <= 20)
      )
    ).slice(0, 10);

    // 불리언 플래그 ("true"/"on"/"1" → true)
    const toBool = (v: FormDataEntryValue | null) =>
      v === "true" || v === "on" || v === "1";
    const isNew = toBool(form.get("isNew"));
    const isBest = toBool(form.get("isBest"));

    // 3. 필드 검증 — Zero Trust, Storage 업로드 前 실행
    if (!name) {
      return NextResponse.json(
        { success: false, error: "상품명(name)이 필요합니다." },
        { status: 400 }
      );
    }
    if (!brand) {
      return NextResponse.json(
        { success: false, error: "브랜드(brand)가 필요합니다." },
        { status: 400 }
      );
    }
    if (!Number.isInteger(price) || price <= 0) {
      return NextResponse.json(
        { success: false, error: "가격(price)은 0보다 큰 정수여야 합니다." },
        { status: 400 }
      );
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: `카테고리는 ${VALID_CATEGORIES.join(", ")} 중 하나여야 합니다.` },
        { status: 400 }
      );
    }
    if (!(image instanceof File)) {
      return NextResponse.json(
        { success: false, error: "이미지 파일(image)이 필요합니다." },
        { status: 400 }
      );
    }
    if (!(image.type in ALLOWED_TYPES)) {
      return NextResponse.json(
        { success: false, error: "jpg/png/webp 이미지만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }
    if (image.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "이미지는 5MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    // 선택 필드 정수 검증 (제공된 경우만)
    const originalPrice = originalPriceRaw
      ? Number.parseInt(originalPriceRaw, 10)
      : undefined;
    if (
      originalPrice !== undefined &&
      (!Number.isInteger(originalPrice) || originalPrice <= 0)
    ) {
      return NextResponse.json(
        { success: false, error: "정가(originalPrice)는 0보다 큰 정수여야 합니다." },
        { status: 400 }
      );
    }

    const discountRate = discountRateRaw
      ? Number.parseInt(discountRateRaw, 10)
      : undefined;
    if (
      discountRate !== undefined &&
      (!Number.isInteger(discountRate) || discountRate < 0)
    ) {
      return NextResponse.json(
        { success: false, error: "할인율(discountRate)은 0 이상의 정수여야 합니다." },
        { status: 400 }
      );
    }

    // 교차검증 — 논리적 불일치 차단(업로드 前)
    if (discountRate !== undefined && discountRate > 100) {
      return NextResponse.json(
        { success: false, error: "할인율(discountRate)은 100 이하여야 합니다." },
        { status: 400 }
      );
    }
    if (originalPrice !== undefined && originalPrice < price) {
      return NextResponse.json(
        { success: false, error: "정가(originalPrice)는 판매가(price) 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // 4. Storage 업로드 (검증 통과 후에만 실행)
    const ext = ALLOWED_TYPES[image.type];
    const data = await image.arrayBuffer();

    // magic-byte 검사 — 선언 MIME과 실제 바이트 일치 여부 확인(헤더만 믿지 않음, 업로드 前)
    const sniffed = sniffImage(data);
    if (sniffed === null || sniffed !== ext) {
      return NextResponse.json(
        { success: false, error: "유효한 이미지 파일이 아닙니다." },
        { status: 400 }
      );
    }

    const { publicUrl } = await uploadProductImage({ data, contentType: image.type, ext });

    // 5. DB 생성 — 실패 시 업로드된 이미지 보상 삭제 후 re-throw(최상위 catch가 500 반환)
    try {
      const productInput: CreateProductInput = {
        name,
        brand,
        price,
        category: category as CreateProductInput["category"],
        imageUrl: publicUrl,
        images: [publicUrl],
        originalPrice,
        discountRate,
        description,
        sizes,
        colors,
        tags,
        isNew,
        isBest,
      };
      const product = await createProduct(productInput);

      // 카탈로그 목록 캐시 무효화 — tag 기반 1회로 8개 소비 페이지 전부 즉시 반영
      // Next.js 16+에서 revalidateTag 두 번째 인자 필수 — 빈 profile({})로 호출
      revalidateTag("products", {});

      return NextResponse.json(
        { success: true, data: { id: product.id } satisfies { id: AdminProductCreateData["id"] } },
        { status: 200 }
      );
    } catch (dbErr) {
      // 고아 파일 방지 — DB 실패 시 업로드된 이미지 보상 삭제
      await removeProductImagesByUrl([publicUrl]).catch(() => {});
      throw dbErr;
    }
  } catch (error) {
    console.error("[admin products POST] error:", error);
    return NextResponse.json(
      { success: false, error: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}
