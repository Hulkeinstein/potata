import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: mock fn을 vi.mock 호이스팅 전에 초기화
const { productCreate, productFindMany } = vi.hoisted(() => ({
  productCreate: vi.fn(),
  productFindMany: vi.fn(),
}));

// prisma.product mock — 실 DB 접근 금지
vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      create: productCreate,
      findMany: productFindMany,
    },
  },
}));

// unstable_cache: 캐시 래핑을 제거하고 fn을 그대로 호출되게 pass-through
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: vi.fn(),
}));

import { createProduct, getAllProducts } from "@/lib/products";
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

// ─── PrismaProduct 형태의 fixture 생성 헬퍼 ────────────────────────────────
// createdAt: Date | string — unstable_cache 직렬화 시뮬레이션을 위해 string 허용
function makePrismaRow(overrides: {
  id: string;
  viewCount?: number;
  rating?: number | null;
  reviewCount?: number | null;
  createdAt?: Date | string;
}) {
  return {
    id: overrides.id,
    name: `상품-${overrides.id}`,
    brand: "TestBrand",
    price: 100,
    originalPrice: null,
    discountRate: null,
    imageUrl: "https://example.com/img.jpg",
    images: ["https://example.com/img.jpg"],
    category: "Top",
    description: null,
    sizes: [],
    colors: [],
    rating: overrides.rating ?? null,
    reviewCount: overrides.reviewCount ?? null,
    isNew: false,
    isBest: false,
    isHot: false,
    viewCount: overrides.viewCount ?? 0,
    createdAt: overrides.createdAt ?? new Date(2020, 0, 1),
    updatedAt: new Date(2020, 0, 1),
  };
}

describe("getAllProducts — isHot 파생 검증", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("viewCount 상위 4개만 isHot:true, 나머지는 isHot:false", async () => {
    // 전체 rows: 6개 상품(viewCount 각각 50, 40, 30, 20, 10, 5)
    const allRows = [
      makePrismaRow({ id: "p1", viewCount: 50 }),
      makePrismaRow({ id: "p2", viewCount: 40 }),
      makePrismaRow({ id: "p3", viewCount: 30 }),
      makePrismaRow({ id: "p4", viewCount: 20 }),
      makePrismaRow({ id: "p5", viewCount: 10 }),
      makePrismaRow({ id: "p6", viewCount: 5 }),
    ];
    // HOT 상위 4개 id rows (getHotProductIds 내부 쿼리 결과)
    const hotRows = [{ id: "p1" }, { id: "p2" }, { id: "p3" }, { id: "p4" }];

    // getAllProducts = Promise.all([getCachedProductRows(), getHotProductIds()])
    // getCachedProductRows → findMany(orderBy:createdAt) 첫 번째 호출
    // getHotProductIds     → findMany(where:viewCount≥1, take:4) 두 번째 호출
    productFindMany
      .mockResolvedValueOnce(allRows)  // getCachedProductRows
      .mockResolvedValueOnce(hotRows); // getHotProductIds

    const products = await getAllProducts();

    // 상위 4개(p1~p4)만 isHot:true
    expect(products.find((p) => p.id === "p1")?.isHot).toBe(true);
    expect(products.find((p) => p.id === "p2")?.isHot).toBe(true);
    expect(products.find((p) => p.id === "p3")?.isHot).toBe(true);
    expect(products.find((p) => p.id === "p4")?.isHot).toBe(true);
    // 나머지(p5, p6)는 isHot:false
    expect(products.find((p) => p.id === "p5")?.isHot).toBe(false);
    expect(products.find((p) => p.id === "p6")?.isHot).toBe(false);
  });

  it("HOT 랭킹 쿼리(getHotProductIds)가 viewCount ≥ 1, take 4 조건으로 findMany 호출됨", async () => {
    const allRows = [
      makePrismaRow({ id: "p1", viewCount: 10 }),
      makePrismaRow({ id: "p2", viewCount: 5 }),
    ];
    const hotRows = [{ id: "p1" }];

    productFindMany
      .mockResolvedValueOnce(allRows)
      .mockResolvedValueOnce(hotRows);

    await getAllProducts();

    // findMany 두 번째 호출 = getHotProductIds 쿼리 — 인자 구조 검증
    const secondCall = productFindMany.mock.calls[1][0] as {
      where?: { viewCount?: { gte?: number } };
      take?: number;
      orderBy?: { viewCount?: string };
      select?: { id?: boolean };
    };
    expect(secondCall.where?.viewCount?.gte).toBe(1);
    expect(secondCall.take).toBe(4);
    expect(secondCall.orderBy?.viewCount).toBe("desc");
    expect(secondCall.select?.id).toBe(true);
  });

  it("전체 상품이 4개 이하일 때 전부 isHot:true", async () => {
    const allRows = [
      makePrismaRow({ id: "p1", viewCount: 3 }),
      makePrismaRow({ id: "p2", viewCount: 2 }),
    ];
    const hotRows = [{ id: "p1" }, { id: "p2" }];

    productFindMany
      .mockResolvedValueOnce(allRows)
      .mockResolvedValueOnce(hotRows);

    const products = await getAllProducts();
    expect(products.every((p) => p.isHot)).toBe(true);
  });

  it("viewCount=0 상품은 getHotProductIds에서 제외 → isHot:false", async () => {
    const allRows = [
      makePrismaRow({ id: "p1", viewCount: 5 }),
      makePrismaRow({ id: "p2", viewCount: 0 }), // 조회수 없음
    ];
    // getHotProductIds는 viewCount>=1만 반환 → p2 없음
    const hotRows = [{ id: "p1" }];

    productFindMany
      .mockResolvedValueOnce(allRows)
      .mockResolvedValueOnce(hotRows);

    const products = await getAllProducts();
    expect(products.find((p) => p.id === "p1")?.isHot).toBe(true);
    expect(products.find((p) => p.id === "p2")?.isHot).toBe(false);
  });

  it("[캐시 직렬화 회귀] createdAt이 ISO 문자열일 때 isNew 파생이 크래시 없이 동작한다", async () => {
    // unstable_cache가 JSON 직렬화 후 역직렬화하면 Date → ISO 문자열로 변형됨.
    // 이 케이스는 그 상황을 재현 — 1주일 이내 createdAt(= isNew:true 예상).
    const recentIso = new Date(Date.now() - 60_000).toISOString(); // 1분 전 (NEW 범위 내)
    const oldIso = new Date(2020, 0, 1).toISOString();             // 2020-01-01 (NEW 범위 밖)

    const allRows = [
      makePrismaRow({ id: "new-str", viewCount: 0, createdAt: recentIso }),
      makePrismaRow({ id: "old-str", viewCount: 0, createdAt: oldIso }),
    ];
    const hotRows: { id: string }[] = [];

    productFindMany
      .mockResolvedValueOnce(allRows)  // getCachedProductRows
      .mockResolvedValueOnce(hotRows); // getHotProductIds

    const products = await getAllProducts();

    // 1분 전 등록 → 1주일 이내 → isNew:true
    expect(products.find((p) => p.id === "new-str")?.isNew).toBe(true);
    // 2020년 등록 → 오래됨 → isNew:false
    expect(products.find((p) => p.id === "old-str")?.isNew).toBe(false);
  });
});
