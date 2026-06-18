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

import { prisma } from "@/lib/prisma";
import type { Product, ProductCategory } from "@/types";
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

/** 전체 상품 목록 반환 (createdAt asc — 시드 순서 유지) */
export async function getAllProducts(): Promise<Product[]> {
  const rows = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toAppProduct);
}

/** 단건 상품 조회. 존재하지 않으면 null 반환 */
export async function getProductById(id: string): Promise<Product | null> {
  const row = await prisma.product.findUnique({ where: { id } });
  return row ? toAppProduct(row) : null;
}
