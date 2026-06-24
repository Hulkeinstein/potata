/**
 * 서버 전용 상품 데이터 접근 헬퍼
 *
 * 왜 이 파일이 필요한가:
 *  - 8개 화면이 각자 prisma를 직접 호출하면 Prisma→앱 타입 변환 코드가 중복됨
 *  - Prisma Product(category String, null 옵셔널) → 앱 Product(ProductCategory, undefined 옵셔널)
 *    차이를 한 곳에서 흡수하기 위해 서버 전용 헬퍼로 통일
 *
 * 주의: "use client" 금지 — prisma가 클라이언트 번들에 포함되면 안 됨
 */

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Product, ProductCategory, CreateProductInput } from "@/types";
import type { Product as PrismaProduct } from "@prisma/client";

/**
 * Prisma Product → 앱 Product 변환
 * - null 옵셔널 필드 → undefined (Prisma는 null, 앱 타입은 ?: undefined)
 * - category String → ProductCategory (DB에 'All' 없음, 실제 6개 카테고리만 저장됨)
 * - stock: 앱 타입에 있으나 DB 컬럼 없음 → 매핑하지 않음(undefined)
 */
function toAppProduct(p: PrismaProduct): Product {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    price: p.price,
    imageUrl: p.imageUrl,
    images: p.images,
    category: p.category as ProductCategory,
    sizes: p.sizes,
    colors: p.colors,
    originalPrice: p.originalPrice ?? undefined,
    discountRate: p.discountRate ?? undefined,
    description: p.description ?? undefined,
    rating: p.rating ?? undefined,
    reviewCount: p.reviewCount ?? undefined,
    isNew: p.isNew,
    isBest: p.isBest,
    isHot: p.isHot,
  };
}

/**
 * 전체 상품 목록 반환 (createdAt asc — 시드 순서 유지)
 * unstable_cache로 래핑 — 8개 소비 페이지가 동일 캐시를 공유하고,
 * 신규 상품 등록 시 revalidateTag("products") 한 번으로 전부 즉시 반영.
 */
export const getAllProducts = unstable_cache(
  async (): Promise<Product[]> => {
    const rows = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(toAppProduct);
  },
  ["all-products"],
  { tags: ["products"] }
);

/** 단건 상품 조회. 존재하지 않으면 null 반환 */
export async function getProductById(id: string): Promise<Product | null> {
  const row = await prisma.product.findUnique({ where: { id } });
  return row ? toAppProduct(row) : null;
}

// ADR-005: DB에 저장 가능한 실제 카테고리 6종('All'은 필터 전용 — 저장 금지)
const VALID_CATEGORIES = ["Outer", "Top", "Bottom", "Dress", "Acc", "Shoes"] as const;

/**
 * 관리자 등록 상품을 DB에 생성한다(ADR-008: admin 상품은 DB가 SSoT).
 * id는 @default가 없으므로 crypto.randomUUID()로 서버에서 공급(시드의 숫자 id와 분리).
 * category는 6종만 허용('All'/임의값 저장 금지 — ADR-005). 위반 시 throw → 라우트 최상위 catch가 400/500 변환.
 */
export async function createProduct(input: CreateProductInput): Promise<Product> {
  if (!VALID_CATEGORIES.includes(input.category as (typeof VALID_CATEGORIES)[number])) {
    throw new Error("유효하지 않은 카테고리입니다.");
  }
  // DB 정합 가드(defense-in-depth) — 라우트(PR2)도 검증하지만 헬퍼가 최종 불변식 보장.
  if (!Number.isInteger(input.price) || input.price <= 0) {
    throw new Error("가격은 0보다 큰 정수여야 합니다.");
  }
  if (input.originalPrice != null && (!Number.isInteger(input.originalPrice) || input.originalPrice <= 0)) {
    throw new Error("정가는 0보다 큰 정수여야 합니다.");
  }
  if (input.discountRate != null && (!Number.isInteger(input.discountRate) || input.discountRate < 0)) {
    throw new Error("할인율은 0 이상의 정수여야 합니다.");
  }
  const row = await prisma.product.create({
    data: {
      id: crypto.randomUUID(),
      name: input.name,
      brand: input.brand,
      price: input.price,
      originalPrice: input.originalPrice ?? null,
      discountRate: input.discountRate ?? null,
      imageUrl: input.imageUrl,
      images: input.images ?? [input.imageUrl],
      category: input.category,
      description: input.description ?? null,
      sizes: input.sizes ?? [],
      colors: input.colors ?? [],
      rating: null,
      reviewCount: null,
      isNew: input.isNew ?? false,
      isBest: input.isBest ?? false,
      isHot: input.isHot ?? false,
    },
  });
  return toAppProduct(row);
}
