import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: mock fn을 vi.mock 호이스팅 전에 초기화
const { productCreate, productFindMany, productFindFirst, productQueryRaw } = vi.hoisted(() => ({
  productCreate: vi.fn(),
  productFindMany: vi.fn(),
  productFindFirst: vi.fn(),
  productQueryRaw: vi.fn(),
}));

// prisma.product mock — 실 DB 접근 금지
// $queryRaw: searchProducts가 태그드 템플릿으로 호출하므로 prisma 최상위에 배치
vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      create: productCreate,
      findMany: productFindMany,
      findFirst: productFindFirst,
    },
    $queryRaw: productQueryRaw,
  },
}));

// unstable_cache: 캐시 래핑을 제거하고 fn을 그대로 호출되게 pass-through
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: vi.fn(),
}));

import { createProduct, getAllProducts, getProductById, searchProducts } from "@/lib/products";
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
        tags: data.tags ?? [],
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

    it("initialStock 미제공 → 모든 생성 옵션의 초기 재고는 5개다", async () => {
      makeCreateMock();
      await createProduct(baseInput);
      const calledWith = productCreate.mock.calls[0][0] as { data: { variants: { create: Array<{ stock: number }> } } };
      expect(calledWith.data.variants.create.every((variant) => variant.stock === 5)).toBe(true);
    });

    it("옵션별 초기 재고 제공 → 각 사이즈·컬러 조합의 재고를 그대로 생성한다", async () => {
      makeCreateMock();
      await createProduct({
        ...baseInput,
        sizes: ["S", "M"],
        colors: ["Black"],
        variantStocks: [
          { size: "S", color: "Black", stock: 2 },
          { size: "M", color: "Black", stock: 8 },
        ],
      });
      const calledWith = productCreate.mock.calls[0][0] as { data: { variants: { create: Array<{ size: string; color: string; stock: number }> } } };
      expect(calledWith.data.variants.create).toEqual([
        { size: "S", color: "Black", stock: 2 },
        { size: "M", color: "Black", stock: 8 },
      ]);
    });
  });

  describe("tags — 기본값 및 전달값 보존", () => {
    it("tags 미제공 → create data.tags = []", async () => {
      makeCreateMock();
      await createProduct(baseInput); // tags 없음
      const calledWith = productCreate.mock.calls[0][0] as {
        data: { tags: string[] };
      };
      expect(calledWith.data.tags).toEqual([]);
    });

    it("tags=['a','b'] 제공 → create data.tags = ['a','b'] 보존", async () => {
      makeCreateMock();
      await createProduct({ ...baseInput, tags: ["a", "b"] });
      const calledWith = productCreate.mock.calls[0][0] as {
        data: { tags: string[] };
      };
      expect(calledWith.data.tags).toEqual(["a", "b"]);
    });
  });
});

describe("고객 카탈로그 활성 상태 경계", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("목록 조회는 활성 상품만 Prisma에 요청한다", async () => {
    productFindMany.mockResolvedValue([]);
    await getAllProducts();
    expect(productFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true } }));
  });

  it("비활성 상품은 단건 고객 조회에서 null 처리한다", async () => {
    productFindFirst.mockResolvedValue(null);
    await expect(getProductById("inactive-product")).resolves.toBeNull();
    expect(productFindFirst).toHaveBeenCalledWith({ where: { id: "inactive-product", isActive: true }, include: { variants: true } });
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
  tags?: string[];
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
    tags: overrides.tags ?? [],
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

describe("searchProducts", () => {
  // $queryRaw는 태그드 템플릿으로 호출됨: prisma.$queryRaw`...${pattern}...`
  // mock.calls[0]은 [TemplateStringsArray, ...values] 형태 — values에서 pattern을 검증

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Happy: 2자 이상 쿼리 → $queryRaw 호출됨, toAppProduct 매핑 결과에 id/isHot/tags 포함", async () => {
    const row = makePrismaRow({ id: "s1", tags: ["데님", "봄"] });
    productQueryRaw.mockResolvedValue([row]);

    const results = await searchProducts("denim");

    // $queryRaw 1회 호출 확인 (findMany 미사용)
    expect(productQueryRaw).toHaveBeenCalledTimes(1);
    expect(productFindMany).not.toHaveBeenCalled();

    // toAppProduct 매핑: id·isHot·tags 확인
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("s1");
    expect(results[0].isHot).toBe(false);
    expect(results[0].tags).toEqual(["데님", "봄"]);
  });

  it("Happy: $queryRaw 바인딩 값에 '%denim%' 패턴 포함", async () => {
    const row = makePrismaRow({ id: "s1" });
    productQueryRaw.mockResolvedValue([row]);

    await searchProducts("denim");

    // 태그드 템플릿 호출: mock.calls[0] = [TemplateStringsArray, value1, ...]
    // value 인자 중 하나가 %denim%을 포함하는지 확인
    const callArgs = productQueryRaw.mock.calls[0] as unknown[];
    const values = callArgs.slice(1); // 첫 번째 인자(TemplateStringsArray) 제외
    const hasPattern = values.some(
      (v) => typeof v === "string" && v.includes("denim")
    );
    expect(hasPattern).toBe(true);
  });

  it("최소 글자수: 1자 쿼리 → $queryRaw 미호출, [] 반환", async () => {
    const results = await searchProducts("a");

    expect(productQueryRaw).not.toHaveBeenCalled();
    expect(results).toEqual([]);
  });

  it("빈 문자열: '' → $queryRaw 미호출, [] 반환", async () => {
    const results = await searchProducts("");

    expect(productQueryRaw).not.toHaveBeenCalled();
    expect(results).toEqual([]);
  });

  it("trim: 앞뒤 공백 포함 '  denim ' → trim 후 2자 이상이므로 $queryRaw 호출됨", async () => {
    const row = makePrismaRow({ id: "s2" });
    productQueryRaw.mockResolvedValue([row]);

    await searchProducts("  denim ");

    expect(productQueryRaw).toHaveBeenCalledTimes(1);
    // trim 후 패턴에 "denim" 포함 확인
    const callArgs = productQueryRaw.mock.calls[0] as unknown[];
    const values = callArgs.slice(1);
    const hasPattern = values.some(
      (v) => typeof v === "string" && v.includes("denim")
    );
    expect(hasPattern).toBe(true);
  });

  it("상한 초과: 101자 쿼리 → $queryRaw 미호출, [] 반환", async () => {
    const results = await searchProducts("a".repeat(101));

    expect(productQueryRaw).not.toHaveBeenCalled();
    expect(results).toEqual([]);
  });

  it("결과 없음: $queryRaw가 [] 반환 → searchProducts 결과 []", async () => {
    productQueryRaw.mockResolvedValue([]);

    const results = await searchProducts("nomatch");

    expect(productQueryRaw).toHaveBeenCalledTimes(1);
    expect(results).toEqual([]);
  });

  it("이스케이프: '50%' 검색 시 바인딩 pattern에 '50\\%'가 포함됨(% 와일드카드로 해석 안 됨)", async () => {
    const row = makePrismaRow({ id: "esc1" });
    productQueryRaw.mockResolvedValue([row]);

    await searchProducts("50%");

    // 태그드 템플릿 호출: mock.calls[0] = [TemplateStringsArray, value1, ...]
    // values 중 pattern 문자열을 찾아 이스케이프 확인
    const callArgs = productQueryRaw.mock.calls[0] as unknown[];
    const values = callArgs.slice(1); // TemplateStringsArray 제외
    const boundPattern = values.find(
      (v) => typeof v === "string" && v.includes("50")
    ) as string | undefined;
    expect(boundPattern).toBeDefined();
    // "50%" → escaped: "50\%" → pattern: "%50\%%"
    // 바인딩 문자열에 백슬래시+%가 연속으로 포함되어야 함(리터럴 %)
    expect(boundPattern).toContain("50\\%");
  });

  it("이스케이프: 'a_b' 검색 시 바인딩 pattern에 'a\\_b'가 포함됨(_ 와일드카드로 해석 안 됨)", async () => {
    const row = makePrismaRow({ id: "esc2" });
    productQueryRaw.mockResolvedValue([row]);

    await searchProducts("a_b");

    const callArgs = productQueryRaw.mock.calls[0] as unknown[];
    const values = callArgs.slice(1);
    const boundPattern = values.find(
      (v) => typeof v === "string" && v.includes("a")
    ) as string | undefined;
    expect(boundPattern).toBeDefined();
    // "a_b" → escaped: "a\_b" → pattern: "%a\_b%"
    expect(boundPattern).toContain("a\\_b");
  });

  it("tags 검색: $queryRaw 호출됨 + 행의 tags 배열이 결과에 그대로 매핑됨", async () => {
    const row = makePrismaRow({ id: "s3", tags: ["자켓", "가을"] });
    productQueryRaw.mockResolvedValue([row]);

    const results = await searchProducts("자켓");

    expect(productQueryRaw).toHaveBeenCalledTimes(1);
    expect(results[0].tags).toEqual(["자켓", "가을"]);
  });
});

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
