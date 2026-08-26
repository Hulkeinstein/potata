import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { adjustInventory, InventoryAdjustmentError } from "@/lib/inventory-adjustment-service";

const runIntegration = process.env.RUN_INTEGRATION === "1";
const fixture = { productId: "", actorId: "", variantId: "" };

afterEach(async () => {
  if (fixture.variantId) await prisma.inventoryAdjustment.deleteMany({ where: { variantId: fixture.variantId } });
  if (fixture.productId) await prisma.product.delete({ where: { id: fixture.productId } });
  if (fixture.actorId) await prisma.user.delete({ where: { id: fixture.actorId } });
  fixture.productId = ""; fixture.actorId = ""; fixture.variantId = "";
});

async function createFixture() {
  const nonce = crypto.randomUUID();
  const actor = await prisma.user.create({ data: { email: `${nonce}@potata.local`, name: "Inventory Admin", passwordHash: "test" } });
  const product = await prisma.product.create({ data: { id: nonce, name: "Inventory Adjustment Test", brand: "Potata QA", price: 100, imageUrl: "https://example.com/item.jpg", category: "Top", variants: { create: { stock: 5 } }, }, include: { variants: true } });
  const variant = product.variants[0];
  if (!variant) throw new Error("Fixture variant was not created");
  fixture.productId = product.id; fixture.actorId = actor.id; fixture.variantId = variant.id;
  return { actorId: actor.id, variantId: variant.id };
}

describe.skipIf(!runIntegration)("inventory adjustments", () => {
  it("applies an adjustment once for an idempotent replay", async () => {
    const { actorId, variantId } = await createFixture();
    const input = { variantId, type: "RECEIVE" as const, delta: 3, reason: "입고 확인", idempotencyKey: crypto.randomUUID() };
    const first = await adjustInventory(actorId, input);
    const replay = await adjustInventory(actorId, input);
    const [variant, count] = await Promise.all([prisma.productVariant.findUnique({ where: { id: variantId } }), prisma.inventoryAdjustment.count({ where: { variantId } })]);
    expect(first.id).toBe(replay.id);
    expect(variant?.stock).toBe(8);
    expect(count).toBe(1);
  });

  it("rejects a disposal that would make stock negative", async () => {
    const { actorId, variantId } = await createFixture();
    await expect(adjustInventory(actorId, { variantId, type: "DISPOSAL", delta: -6, reason: "폐기", idempotencyKey: crypto.randomUUID() })).rejects.toBeInstanceOf(InventoryAdjustmentError);
    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    expect(variant?.stock).toBe(5);
  });
});
