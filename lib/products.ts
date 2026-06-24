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

// NEW 배지: 등록 후 이 기간 이내인 상품을 자동으로 NEW 처리
const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 등록 1주일 이내 = NEW
// BEST 배지: 별점·리뷰 수 양쪽을 동시에 충족해야 BEST (소수 리뷰 고점 방지)
const BEST_MIN_RATING = 4.8;   // BEST: 별점 임계값(조정 가능)
const BEST_MIN_REVIEWS = 100;  // BEST: 최소 리뷰수(소수 리뷰 5점 배제)

/**
 * HOT 랭킹: 조회수 상위 4개 id.
 * products 캐시와 독립(30분 주기 갱신) — 조회 증가가 카탈로그 캐시를 깨지 않게 분리.
 * unstable_cache는 직렬화 가능 값만 반환 가능하므로 string[] 반환(Set 불가).
 */
const getHotProductIds = unstable_cache(
  async (): Promise<string[]> => {
    const rows = await prisma.product.findMany({
      where: { viewCount: { gte: 1 } },
      orderBy: { viewCount: "desc" },
      take: 4,
      select: { id: true },
    });
    return rows.map((r) => r.id);
  },
  ["hot-product-ids"],
  { revalidate: 1800, tags: ["hot-products"] }
);

/**
 * Prisma Product → 앱 Product 변환
 * - null 옵셔널 필드 → undefined (Prisma는 null, 앱 타입은 ?: undefined)
 * - category String → ProductCategory (DB에 'All' 없음, 실제 6개 카테고리만 저장됨)
 * - stock: 앱 타입에 있으나 DB 컬럼 없음 → 매핑하지 않음(undefined)
 * - isNew/isBest: DB 저장값 무시 — createdAt·rating·reviewCount 기반 자동 파생
 * - isHot: hotIds Set 멤버십으로 파생 — viewCount 상위 4개가 HOT (독립 캐시 기반)
 */
function toAppProduct(p: PrismaProduct, hotIds?: Set<string>): Product {
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
    // unstable_cache JSON 직렬화 후 재역직렬화 시 createdAt이 ISO 문자열이 될 수 있음 → new Date()로 정규화
    isNew: Date.now() - new Date(p.createdAt).getTime() < NEW_WINDOW_MS,
    isBest: p.rating != null && p.rating >= BEST_MIN_RATING && (p.reviewCount ?? 0) >= BEST_MIN_REVIEWS,
    isHot: hotIds ? hotIds.has(p.id) : false,
  };
}

/**
 * 전체 상품 raw rows 캐시 (카탈로그 캐시 — revalidateTag("products") 대상)
 * HOT 랭킹 캐시(hot-products)와 독립 분리: 조회수 갱신이 이 캐시를 건드리지 않음.
 */
const getCachedProductRows = unstable_cache(
  async () => prisma.product.findMany({ orderBy: { createdAt: "asc" } }),
  ["all-product-rows"],
  { tags: ["products"] }
);

/**
 * 전체 상품 목록 반환 (createdAt asc — 시드 순서 유지)
 * raw rows 캐시와 HOT 랭킹 캐시를 캐시 밖에서 병렬 조회 후 merge.
 * → 신규 상품 등록 시 revalidateTag("products") 한 번으로 카탈로그 전부 즉시 반영.
 * → HOT 랭킹은 조회 시 즉시 갱신 + 시간기반 백업:
 *    - view 라우트(POST /api/products/[id]/view)가 조회수 increment 성공 후
 *      revalidateTag("hot-products")를 호출 → 다음 렌더에서 top-4 재계산.
 *    - revalidate:1800(30분) 시간기반 백업은 view 라우트 미도달 시 보정.
 *    - "products" 캐시(카탈로그 rows)는 무영향 — rows 재쿼리 없음.
 */
export async function getAllProducts(): Promise<Product[]> {
  const [rows, hotIds] = await Promise.all([getCachedProductRows(), getHotProductIds()]);
  const hotSet = new Set(hotIds);
  return rows.map((r) => toAppProduct(r, hotSet));
}

/**
 * 단건 상품 조회. 존재하지 않으면 null 반환.
 *
 * getProductById는 unstable_cache 미사용 — cart/ootd 라우트가 Next 요청 컨텍스트 밖
 * (통합테스트)에서 핸들러를 직접 호출하므로 incrementalCache가 없어 invariant throw.
 * isHot은 getAllProducts(목록)에서만 파생하며, 상세/cart/ootd 소비처는 isHot 불필요.
 */
export async function getProductById(id: string): Promise<Product | null> {
  const row = await prisma.product.findUnique({ where: { id } });
  // hotIds 미전달 → isHot false (상세 소비처는 HOT 배지 미사용)
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
