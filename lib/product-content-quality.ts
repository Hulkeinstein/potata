export type ProductContentFact = {
  readonly descriptionKo?: string | null;
  readonly descriptionEn?: string | null;
  readonly imageUrl?: string | null;
};
export type ProductContentGap = "ko" | "en" | "image";
export const PRODUCT_CONTENT_GAP_LABELS = { ko: "한국어 설명 없음", en: "영어 설명 없음", image: "대표 사진 없음" } as const;
export const PRODUCT_CONTENT_QUALITY_OPTIONS = [
  { value: "all", label: "전체 상품" },
  { value: "missing-any", label: "누락 있는 상품" },
  { value: "missing-ko", label: "한국어 설명 없음" },
  { value: "missing-en", label: "영어 설명 없음" },
  { value: "missing-image", label: "대표 사진 없음" },
] as const;
export type ProductContentQuality = typeof PRODUCT_CONTENT_QUALITY_OPTIONS[number]["value"];

export function getProductContentGaps(product: ProductContentFact): readonly ProductContentGap[] {
  const fields = [
    ["ko", product.descriptionKo], ["en", product.descriptionEn], ["image", product.imageUrl],
  ] as const;
  return fields.flatMap(([key, value]) => value !== undefined && (value === null || value.trim() === "") ? [key] : []);
}

export function matchesProductContentQuality(product: ProductContentFact, quality: ProductContentQuality): boolean {
  const gaps = getProductContentGaps(product);
  switch (quality) {
    case "all": return true;
    case "missing-any": return gaps.length > 0;
    case "missing-ko": return gaps.includes("ko");
    case "missing-en": return gaps.includes("en");
    case "missing-image": return gaps.includes("image");
    default: { const unreachable: never = quality; return unreachable; }
  }
}
