export type InventoryStatus = "ON_SALE" | "SOLD_OUT" | "MANUAL_SOLD_OUT";

export type InventoryVariant = {
  readonly stock: number;
  readonly isManuallySoldOut: boolean;
};

export function getInventoryStatus(variant: InventoryVariant): InventoryStatus {
  if (variant.isManuallySoldOut) return "MANUAL_SOLD_OUT";
  return variant.stock > 0 ? "ON_SALE" : "SOLD_OUT";
}

export function getProductInventoryStatus(variants: readonly InventoryVariant[]): Exclude<InventoryStatus, "MANUAL_SOLD_OUT"> {
  return variants.some((variant) => getInventoryStatus(variant) === "ON_SALE") ? "ON_SALE" : "SOLD_OUT";
}

export function isVariantPurchasable(variant: InventoryVariant): boolean {
  return getInventoryStatus(variant) === "ON_SALE";
}
