// @vitest-environment node
import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { updateAdminProductStatuses, updateAdminProductStatus } from "./admin-product-catalog";

const run = process.env.RUN_INTEGRATION === "1";
const brand = `bulk-status-${crypto.randomUUID()}`;
const ids = [`${brand}-one`, `${brand}-two`];
let baseline = "";
let created = false;
async function originalFingerprint() {
  const products = await prisma.product.findMany({ where: { NOT: { brand } }, orderBy: { id: "asc" } });
  const variants = await prisma.productVariant.findMany({ where: { product: { NOT: { brand } } }, orderBy: { id: "asc" } });
  return createHash("sha256").update(JSON.stringify([products, variants])).digest("hex");
}
beforeAll(async () => {
  if (!run) return;
  const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.pathname !== "/potata_dev") throw new Error("Bulk status integration requires local potata_dev only.");
  baseline = await originalFingerprint();
  await prisma.$transaction(ids.map((id, index) => prisma.product.create({ data: {
    id, name: id, brand, category: "Top", price: 123, imageUrl: "/qa.png", descriptionKo: "QA 한국어", descriptionEn: "QA English", isActive: index === 0,
    variants: { create: [{ size: "S", stock: 0 }, { size: "M", stock: 5, isManuallySoldOut: true }] },
  } })));
  created = true;
});
afterAll(async () => {
  if (!run) return;
  try {
    if (created) await prisma.product.deleteMany({ where: { id: { in: ids }, brand } });
    expect(await originalFingerprint()).toBe(baseline);
  } finally { await prisma.$disconnect(); }
});
describe.skipIf(!run)("real atomic bulk status writes", () => {
  it("changes only product visibility while preserving all option data", async () => {
    const before = await prisma.product.findMany({ where: { id: { in: ids } }, include: { variants: true }, orderBy: { id: "asc" } });
    expect(await updateAdminProductStatuses(ids, false)).toBe(2);
    const after = await prisma.product.findMany({ where: { id: { in: ids } }, include: { variants: true }, orderBy: { id: "asc" } });
    expect(after.map(({ isActive }) => isActive)).toEqual([false, false]);
    after.forEach((product, index) => expect(product).toEqual({ ...before[index], isActive: product.isActive, updatedAt: product.updatedAt }));
  });
  it("rolls back every matched product when a requested ID is absent", async () => {
    const before = await prisma.product.findMany({ where: { id: { in: ids } }, orderBy: { id: "asc" } });
    expect(await updateAdminProductStatuses([...ids, `${brand}-missing`], true)).toBe(0);
    expect(await prisma.product.findMany({ where: { id: { in: ids } }, orderBy: { id: "asc" } })).toEqual(before);
  });
  it("accepts repeated explicit reexposure without touching stock or manual sold-out flags", async () => {
    const before = await prisma.productVariant.findMany({ where: { productId: { in: ids } }, orderBy: { id: "asc" } });
    expect(await updateAdminProductStatuses(ids, true)).toBe(2);
    expect(await updateAdminProductStatuses(ids, true)).toBe(2);
    expect(await prisma.productVariant.findMany({ where: { productId: { in: ids } }, orderBy: { id: "asc" } })).toEqual(before);
  });
  it("preserves the existing single-product missing contract", async () => {
    expect(await updateAdminProductStatus(`${brand}-absent`, false)).toBe(false);
  });
});
