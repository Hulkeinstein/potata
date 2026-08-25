import { isVariantPurchasable } from "@/lib/inventory";
import type { ProductVariantStockInput } from "@/types";

type StoredVariant = {
  readonly size: string;
  readonly color: string;
  readonly stock: number;
  readonly isManuallySoldOut: boolean;
};

export type VariantSelection = {
  readonly productId: string;
  readonly size: string;
  readonly color: string;
  readonly quantity: number;
};

export function findPurchasableVariant<T extends StoredVariant>(
  variants: readonly T[],
  selection: Pick<VariantSelection, "size" | "color" | "quantity">,
): T | null {
  const variant = variants.find((item) => item.size === selection.size && item.color === selection.color);
  return variant && isVariantPurchasable(variant) && variant.stock >= selection.quantity ? variant : null;
}

export function getVariantLabel(variant: Pick<StoredVariant, "size" | "color">): string {
  return [variant.color, variant.size].filter(Boolean).join(" / ") || "기본 옵션";
}

export function buildInitialProductVariants(
  sizes: readonly string[],
  colors: readonly string[],
  initialStock: number,
  variantStocks?: readonly ProductVariantStockInput[],
): readonly ProductVariantStockInput[] {
  const expected = sizes.flatMap((size) => colors.map((color) => ({ size, color })));
  if (!variantStocks) return expected.map((variant) => ({ ...variant, stock: initialStock }));
  if (variantStocks.length !== expected.length) throw new Error("옵션별 초기 재고가 상품 옵션 조합과 일치하지 않습니다.");

  const byOption = new Map(variantStocks.map((variant) => [`${variant.size}\u0000${variant.color}`, variant]));
  if (byOption.size !== expected.length) throw new Error("옵션별 초기 재고가 중복되었습니다.");

  return expected.map((variant) => {
    const stock = byOption.get(`${variant.size}\u0000${variant.color}`);
    if (!stock || !Number.isInteger(stock.stock) || stock.stock < 0) {
      throw new Error("옵션별 초기 재고가 상품 옵션 조합과 일치하지 않습니다.");
    }
    return stock;
  });
}
