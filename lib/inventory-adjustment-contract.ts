export const INVENTORY_ADJUSTMENT_TYPES = ["RECEIVE", "CORRECTION", "DISPOSAL"] as const;
export type InventoryAdjustmentType = (typeof INVENTORY_ADJUSTMENT_TYPES)[number];

export type InventoryAdjustmentInput = {
  readonly variantId: string;
  readonly type: InventoryAdjustmentType;
  readonly delta: number;
  readonly reason: string;
  readonly idempotencyKey: string;
};

export type InventoryAdjustmentParse =
  | { readonly ok: true; readonly value: InventoryAdjustmentInput }
  | { readonly ok: false; readonly error: string };

const hasAdjustmentType = (value: unknown): value is InventoryAdjustmentType => typeof value === "string" && INVENTORY_ADJUSTMENT_TYPES.includes(value as InventoryAdjustmentType);

export function parseInventoryAdjustmentInput(value: unknown): InventoryAdjustmentParse {
  if (!value || typeof value !== "object") return { ok: false, error: "Invalid inventory adjustment" };
  const input = value as Record<string, unknown>;
  const variantId = typeof input.variantId === "string" ? input.variantId.trim() : "";
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  const idempotencyKey = typeof input.idempotencyKey === "string" ? input.idempotencyKey.trim() : "";
  const delta = input.delta;
  if (!variantId || !hasAdjustmentType(input.type) || typeof delta !== "number" || !Number.isInteger(delta) || !idempotencyKey) return { ok: false, error: "Invalid inventory adjustment" };
  if (delta === 0) return { ok: false, error: "조정 수량은 0이 아니어야 합니다." };
  if (!reason || reason.length > 200) return { ok: false, error: "조정 사유가 필요합니다." };
  if (input.type === "RECEIVE" && delta < 0) return { ok: false, error: "입고는 양수 수량이어야 합니다." };
  if (input.type === "DISPOSAL" && delta > 0) return { ok: false, error: "폐기는 음수 수량이어야 합니다." };
  return { ok: true, value: { variantId, type: input.type, delta, reason, idempotencyKey } };
}
