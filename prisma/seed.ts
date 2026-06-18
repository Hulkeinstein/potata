import { PrismaClient } from "@prisma/client";
import { PRODUCTS } from "../data/dummy";

const prisma = new PrismaClient();

async function main() {
  console.log("시드 시작: 상품 8개 upsert...");

  for (const product of PRODUCTS) {
    const data = {
      name: product.name,
      brand: product.brand,
      price: product.price,
      originalPrice: product.originalPrice ?? null,
      discountRate: product.discountRate ?? null,
      imageUrl: product.imageUrl,
      images: product.images ?? [],
      category: product.category ?? "",
      description: product.description ?? null,
      sizes: product.sizes ?? [],
      colors: product.colors ?? [],
      rating: product.rating ?? null,
      reviewCount: product.reviewCount ?? null,
      isNew: product.isNew ?? false,
      isBest: product.isBest ?? false,
      isHot: product.isHot ?? false,
    };

    await prisma.product.upsert({
      where: { id: product.id },
      create: { id: product.id, ...data },
      update: data,
    });
  }

  const count = await prisma.product.count();
  console.log(`시드 완료: 총 ${count}개 상품`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
