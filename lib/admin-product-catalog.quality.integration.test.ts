// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { listAdminProducts } from "./admin-product-catalog";
import { parseAdminCatalogQuery } from "./admin-catalog-query";
import { listOperationsIssues } from "./operations-assistant";
import { replaceAdminProductImage } from "./admin-product-image";

const run = process.env.RUN_INTEGRATION === "1";
const brand = `quality-fixture-${crypto.randomUUID()}`;
const ids = ["legacy", "blank", "healthy", "english"].map((suffix) => `${brand}-${suffix}`);
let created = false;
function query(value: string) {
  return parseAdminCatalogQuery(new URLSearchParams(`brand=${brand}&${value}`));
}
beforeAll(async () => {
  if (!run) return;
  const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.pathname !== "/potata_dev") throw new Error("Quality integration requires local potata_dev only.");
  await prisma.$transaction(ids.map((id, index) => prisma.product.create({ data: {
    id, name: id, brand, category: "Top", price: (index + 1) * 100, isActive: index !== 0,
    imageUrl: index === 1 ? " \t" : "/known.png", description: "Legacy fallback",
    descriptionKo: index === 0 ? null : index === 1 ? " \n\u00a0\u3000" : "한국어",
    descriptionEn: index === 1 ? null : index === 3 ? " \n" : "English",
    variants: { create: { size: "M", color: "QA", stock: 5 } },
  } })));
  created = true;
});
afterAll(async () => {
  if (!run) return;
  if (created) await prisma.product.deleteMany({ where: { id: { in: ids }, brand } });
  await prisma.$disconnect();
});

describe.skipIf(!run)("real local content-quality queries", () => {
  it("classifies null and Unicode whitespace before pagination without legacy fallback hiding gaps", async () => {
    const [any, ko, en, image] = await Promise.all([
      listAdminProducts(query("quality=missing-any&sort=price-asc")),
      listAdminProducts(query("quality=missing-ko&sort=price-asc")),
      listAdminProducts(query("quality=missing-en&sort=price-asc")),
      listAdminProducts(query("quality=missing-image")),
    ]);
    expect(any.items.map(({ id }) => id)).toEqual([ids[0], ids[1], ids[3]]);
    expect(any.total).toBe(3);
    expect(ko.items.map(({ id }) => id)).toEqual([ids[0], ids[1]]);
    expect(en.items.map(({ id }) => id)).toEqual([ids[1], ids[3]]);
    expect(image.items.map(({ id }) => id)).toEqual([ids[1]]);
  });
  it("combines existing filters and paginates the matching collection rather than a partial page", async () => {
    const active = await listAdminProducts(query("quality=missing-ko&status=active&category=Top"));
    const page = await listAdminProducts(query("quality=missing-any&sort=price-asc&pageSize=1&page=2"));
    expect(active.items.map(({ id }) => id)).toEqual([ids[1]]);
    expect(page.items.map(({ id }) => id)).toEqual([ids[1]]);
    expect(page.total).toBe(3);
  });
  it("removes resolved content gaps from both the catalog and existing operations detector", async () => {
    const targetId = ids[1];
    if (!targetId) throw new Error("Missing test fixture ID");
    const before = (await listOperationsIssues()).filter(({ targetId: id }) => id === targetId);
    expect(before.map(({ kind }) => kind)).toEqual(["MISSING_PRODUCT_DESCRIPTION", "MISSING_PRODUCT_IMAGE"]);
    await prisma.product.update({ where: { id: targetId }, data: { descriptionKo: "작성 완료", descriptionEn: "Complete", imageUrl: "/registered.png" } });
    expect((await listAdminProducts(query("quality=missing-image"))).total).toBe(0);
    expect((await listOperationsIssues()).filter(({ targetId: id }) => id === targetId)).toEqual([]);
  });
  it.each(["", " \n\t"])("repairs the exact stored blank image token %j without changing inventory", async (imageUrl) => {
    const targetId = ids[2];
    if (!targetId) throw new Error("Missing test fixture ID");
    await prisma.product.update({ where: { id: targetId }, data: { imageUrl } });
    const before = await prisma.product.findUniqueOrThrow({ where: { id: targetId }, include: { variants: true } });
    expect(await replaceAdminProductImage(targetId, imageUrl, "/repaired.png")).toEqual({ kind: "saved", imageUrl: "/repaired.png" });
    const after = await prisma.product.findUniqueOrThrow({ where: { id: targetId }, include: { variants: true } });
    expect(after.variants).toEqual(before.variants);
    expect(after.imageUrl).toBe("/repaired.png");
    expect(after.images[0]).toBe(after.imageUrl);
  });
});
