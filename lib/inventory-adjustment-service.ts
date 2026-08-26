import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { InventoryAdjustmentInput } from "@/lib/inventory-adjustment-contract";

export class InventoryAdjustmentError extends Error {}

type AdjustmentResult = {
  readonly id: string;
  readonly variantId: string;
  readonly type: string;
  readonly delta: number;
  readonly stockBefore: number;
  readonly stockAfter: number;
  readonly reason: string;
  readonly createdAt: Date;
};

const requestHash = (actorId: string, input: InventoryAdjustmentInput): string => createHash("sha256").update(JSON.stringify({ actorId, ...input })).digest("hex");
const isRetryable = (error: unknown): boolean => error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || error.code === "P2034");

function isSameRequest(adjustment: { readonly actorId: string; readonly requestHash: string }, actorId: string, hash: string): boolean {
  return adjustment.actorId === actorId && adjustment.requestHash === hash;
}

function toResult(adjustment: AdjustmentResult): AdjustmentResult {
  return adjustment;
}

export async function adjustInventory(actorId: string, input: InventoryAdjustmentInput): Promise<AdjustmentResult> {
  const hash = requestHash(actorId, input);
  const replay = await prisma.inventoryAdjustment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (replay) {
    if (!isSameRequest(replay, actorId, hash)) throw new InventoryAdjustmentError("멱등 키 충돌입니다.");
    return toResult(replay);
  }

  async function write(attempt: number): Promise<AdjustmentResult> {
    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.inventoryAdjustment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (existing) {
          if (!isSameRequest(existing, actorId, hash)) throw new InventoryAdjustmentError("멱등 키 충돌입니다.");
          return toResult(existing);
        }
        const variant = await tx.productVariant.findUnique({ where: { id: input.variantId }, select: { id: true, stock: true } });
        if (!variant) throw new InventoryAdjustmentError("상품 옵션을 찾을 수 없습니다.");
        const stockAfter = variant.stock + input.delta;
        if (stockAfter < 0) throw new InventoryAdjustmentError("재고가 부족합니다.");
        const updated = await tx.productVariant.updateMany({ where: { id: variant.id, stock: variant.stock }, data: { stock: stockAfter } });
        if (updated.count !== 1) throw new InventoryAdjustmentError("재고 조정 충돌입니다. 다시 시도해 주세요.");
        const adjustment = await tx.inventoryAdjustment.create({ data: { variantId: variant.id, actorId, type: input.type, delta: input.delta, stockBefore: variant.stock, stockAfter, reason: input.reason, requestHash: hash, idempotencyKey: input.idempotencyKey } });
        return toResult(adjustment);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (attempt < 2 && isRetryable(error)) return write(attempt + 1);
      throw error;
    }
  }
  return write(0);
}

export async function listVariantInventoryAdjustments(variantId: string, cursor?: string) {
  const rows = await prisma.inventoryAdjustment.findMany({
    where: { variantId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 21,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, type: true, delta: true, stockBefore: true, stockAfter: true, reason: true, createdAt: true, actor: { select: { name: true } } },
  });
  const items = rows.slice(0, 20);
  const last = items.at(-1);
  return { items, nextCursor: rows.length > items.length && last ? last.id : null };
}
