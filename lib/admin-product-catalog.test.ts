import { describe, expect, it } from "vitest";
import { parseAdminCatalogQuery } from "@/lib/admin-product-catalog";

describe("parseAdminCatalogQuery", () => {
  it("검색어를 보존하고 첫 페이지의 기본 크기를 사용한다", () => {
    expect(parseAdminCatalogQuery(new URLSearchParams("q=Seoul+Brand"))).toEqual({ query: "Seoul Brand", page: 1, pageSize: 20 });
  });

  it("잘못된 pagination 입력은 안전한 기본값으로 제한한다", () => {
    expect(parseAdminCatalogQuery(new URLSearchParams("page=-2&pageSize=1000"))).toEqual({ query: "", page: 1, pageSize: 50 });
  });
});
