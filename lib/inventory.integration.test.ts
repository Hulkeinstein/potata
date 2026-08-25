import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";

const runIntegration = process.env.RUN_INTEGRATION === "1";
const createdProductIds: string[] = [];

afterEach(async () => {
  if (createdProductIds.length > 0) await prisma.product.deleteMany({ where: { id: { in: createdProductIds.splice(0) } } });
});

describe.skipIf(!runIntegration)("ProductVariant stock concurrency", () => {
  it("does not decrement stock below zero when two orders race for the last item", async () => {
    const product = await prisma.product.create({
      data: {
        id: crypto.randomUUID(),
        name: "Inventory integration product",
        brand: "Potata QA",
        price: 100,
        imageUrl: "https://example.com/inventory.jpg",
        category: "Top",
        variants: { create: { size: "M", color: "Black", stock: 1 } },
      },
      include: { variants: true },
    });
    createdProductIds.push(product.id);
    const variant = product.variants[0];
    if (!variant) throw new Error("Test variant was not created");

    const results = await Promise.all([
      prisma.productVariant.updateMany({ where: { id: variant.id, stock: { gte: 1 }, isManuallySoldOut: false }, data: { stock: { decrement: 1 } } }),
      prisma.productVariant.updateMany({ where: { id: variant.id, stock: { gte: 1 }, isManuallySoldOut: false }, data: { stock: { decrement: 1 } } }),
    ]);

    expect(results.map((result) => result.count).sort()).toEqual([0, 1]);
    const stored = await prisma.productVariant.findUnique({ where: { id: variant.id } });
    expect(stored?.stock).toBe(0);
  });
});
