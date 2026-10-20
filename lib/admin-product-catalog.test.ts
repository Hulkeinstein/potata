import { describe, expect, it } from "vitest";
import { parseAdminCatalogQuery } from "@/lib/admin-product-catalog";

describe("parseAdminCatalogQuery", () => {
  it("검색어를 보존하고 첫 페이지의 기본 크기를 사용한다", () => {
    expect(parseAdminCatalogQuery(new URLSearchParams("q=Seoul+Brand"))).toMatchObject({ query: "Seoul Brand", page: 1, pageSize: 20 });
  });

  it("잘못된 pagination 입력은 안전한 기본값으로 제한한다", () => {
    expect(parseAdminCatalogQuery(new URLSearchParams("page=-2&pageSize=1000"))).toMatchObject({ query: "", page: 1, pageSize: 50 });
  });

  it("브랜드·카테고리·상태·정렬을 보존하고 과도한 페이지를 제한한다", () => {
    expect(parseAdminCatalogQuery(new URLSearchParams("brand=Seoul&category=Top&status=sold-out&sort=price-asc&page=999"))).toMatchObject({ brand: "Seoul", category: "Top", status: "sold-out", sort: "price-asc", page: 100 });
  });
});
