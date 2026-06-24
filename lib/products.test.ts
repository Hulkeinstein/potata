import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: mock fn을 vi.mock 호이스팅 전에 초기화
const { productCreate } = vi.hoisted(() => ({
  productCreate: vi.fn(),
}));

// prisma.product.create mock — 실 DB 접근 금지
vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      create: productCreate,
    },
  },
}));

import { createProduct } from "@/lib/products";
import type { CreateProductInput } from "@/types";

/** UUID v4 형식 정규식 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** create mock 기본 행 생성 — 전달된 data를 반영 */
function makeCreateMock() {
  productCreate.mockImplementation(
    ({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        id: data.id,
        name: data.name,
        brand: data.brand,
        price: data.price,
        originalPrice: data.originalPrice ?? null,
        discountRate: data.discountRate ?? null,
        imageUrl: data.imageUrl,
        images: data.images,
        category: data.category,
        description: data.description ?? null,
        sizes: data.sizes,
        colors: data.colors,
        rating: null,
        reviewCount: null,
        isNew: data.isNew,
        isBest: data.isBest,
        isHot: data.isHot,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
  );
}

/** 유효한 최소 입력 fixture */
const baseInput: CreateProductInput = {
  name: "화이트 티셔츠",
  brand: "ZARA",
  price: 100,
  category: "Top",
  imageUrl: "https://example.com/img.jpg",
};

describe("createProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Happy path — 유효 입력(category=Top)", () => {
    it("prisma.product.create가 정확히 1회 호출된다", async () => {
      makeCreateMock();
      await createProduct(baseInput);
      expect(productCreate).toHaveBeenCalledTimes(1);
    });

    it("create에 전달된 data.id가 UUID 형식(36자)이다", async () => {
      makeCreateMock();
      await createProduct(baseInput);
      const calledWith = productCreate.mock.calls[0][0] as { data: { id: string } };
      expect(calledWith.data.id).toMatch(UUID_REGEX);
    });

    it("반환된 앱 Product에 id·category·name이 채워진다", async () => {
      makeCreateMock();
      const result = await createProduct(baseInput);
      expect(result.id).toMatch(UUID_REGEX);
      expect(result.category).toBe("Top");
      expect(result.name).toBe("화이트 티셔츠");
    });
  });

  describe("Negative — 유효하지 않은 category", () => {
    it("category='All' → throws '유효하지 않은 카테고리', create 미호출", async () => {
      await expect(
        createProduct({ ...baseInput, category: "All" })
      ).rejects.toThrow("유효하지 않은 카테고리");
      expect(productCreate).not.toHaveBeenCalled();
    });

    it("category='Foo'(임의값) → throws '유효하지 않은 카테고리', create 미호출", async () => {
      await expect(
        // 타입 안전성 우회 — 런타임 방어 코드 검증
        createProduct({ ...baseInput, category: "Foo" as never })
      ).rejects.toThrow("유효하지 않은 카테고리");
      expect(productCreate).not.toHaveBeenCalled();
    });
  });

  describe("Negative — 유효하지 않은 숫자 필드(price 가드)", () => {
    it("price=0 → throws '가격은 0보다 큰 정수', create 미호출", async () => {
      await expect(
        createProduct({ ...baseInput, price: 0 })
      ).rejects.toThrow("가격은 0보다 큰 정수여야 합니다.");
      expect(productCreate).not.toHaveBeenCalled();
    });

    it("price=-5(음수) → throws '가격은 0보다 큰 정수', create 미호출", async () => {
      await expect(
        createProduct({ ...baseInput, price: -5 })
      ).rejects.toThrow("가격은 0보다 큰 정수여야 합니다.");
      expect(productCreate).not.toHaveBeenCalled();
    });

    it("price=99.9(비정수) → throws '가격은 0보다 큰 정수', create 미호출", async () => {
      await expect(
        createProduct({ ...baseInput, price: 99.9 })
      ).rejects.toThrow("가격은 0보다 큰 정수여야 합니다.");
      expect(productCreate).not.toHaveBeenCalled();
    });

    it("originalPrice=-1(음수) → throws '정가는 0보다 큰 정수', create 미호출", async () => {
      await expect(
        createProduct({ ...baseInput, originalPrice: -1 })
      ).rejects.toThrow("정가는 0보다 큰 정수여야 합니다.");
      expect(productCreate).not.toHaveBeenCalled();
    });
  });

  describe("Edge — 선택 필드 미제공 시 기본값 반영", () => {
    it("originalPrice 미제공 → create data.originalPrice null", async () => {
      makeCreateMock();
      await createProduct(baseInput); // originalPrice 없음
      const calledWith = productCreate.mock.calls[0][0] as {
        data: { originalPrice: unknown };
      };
      expect(calledWith.data.originalPrice).toBeNull();
    });

    it("images 미제공 → create data.images = [imageUrl]", async () => {
      makeCreateMock();
      await createProduct(baseInput);
      const calledWith = productCreate.mock.calls[0][0] as {
        data: { images: string[] };
      };
      expect(calledWith.data.images).toEqual([baseInput.imageUrl]);
    });

    it("sizes 미제공 → create data.sizes = []", async () => {
      makeCreateMock();
      await createProduct(baseInput);
      const calledWith = productCreate.mock.calls[0][0] as {
        data: { sizes: string[] };
      };
      expect(calledWith.data.sizes).toEqual([]);
    });

    it("isNew 미제공 → create data.isNew = false", async () => {
      makeCreateMock();
      await createProduct(baseInput);
      const calledWith = productCreate.mock.calls[0][0] as {
        data: { isNew: boolean };
      };
      expect(calledWith.data.isNew).toBe(false);
    });
  });
});
