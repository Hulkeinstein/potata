/**
 * 단건 상품 DB 조회 검증 헬퍼 (product-detail 스킬의 검증 단계용)
 *
 * 실행: node --env-file=.env --import tsx prisma/check-product.ts <id>
 *
 * 왜 이렇게 실행하나:
 *  - `.env`를 직접 로드(`--env-file`) — Prisma CLI 밖이라 자동 로드 안 됨
 *  - 일회성 스크립트는 DIRECT_URL(비-pooled) 사용 — pooled(pgBouncer) 연결은
 *    "prepared statement already exists" 충돌을 일으킴
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

const id = process.argv[2];
if (!id) {
  console.error("usage: node --env-file=.env --import tsx prisma/check-product.ts <id>");
  process.exit(2);
}

prisma.product
  .findUnique({ where: { id } })
  .then((p) => {
    console.log(p ? JSON.stringify(p, null, 2) : `NOT FOUND: id=${id}`);
    return prisma.$disconnect().then(() => process.exit(p ? 0 : 1));
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
