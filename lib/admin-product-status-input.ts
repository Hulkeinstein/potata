export const MAX_PRODUCT_STATUS_BATCH = 50;
export type ProductStatusBatch = { readonly ids: readonly string[]; readonly isActive: boolean };

export function parseProductStatusBatch(value: unknown): ProductStatusBatch | null {
  if (!value || typeof value !== "object" || !("ids" in value) || !("isActive" in value)) return null;
  if (Object.keys(value).some((key) => key !== "ids" && key !== "isActive") || typeof value.isActive !== "boolean") return null;
  if (!Array.isArray(value.ids) || value.ids.length < 1 || value.ids.length > MAX_PRODUCT_STATUS_BATCH) return null;
  const ids: string[] = [];
  for (const id of value.ids) {
    if (typeof id !== "string" || id.length < 1 || id.length > 200 || id.trim() !== id || ids.includes(id)) return null;
    ids.push(id);
  }
  return { ids, isActive: value.isActive };
}
