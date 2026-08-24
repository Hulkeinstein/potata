import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("unsupported affordance source contracts", () => {
  it("checkout은 실제 결제 대신 PENDING 주문 저장 경계를 정직하게 알린다", () => {
    const checkout = source("app/checkout/page.tsx");
    expect(checkout).toContain("실제 결제는 아직 진행되지 않습니다");
    expect(checkout).not.toContain("결제가 진행됩니다");
  });

  it("Shop은 실제 category와 load-more만 남기고 가짜 filter/sort 버튼을 제거한다", () => {
    const shop = source("app/shop/ShopContent.tsx");
    expect(shop).toContain('role="tab"');
    expect(shop).toContain("handleLoadMore");
    expect(shop).not.toContain('aria-label="Open filters"');
    expect(shop).not.toContain('aria-label="Sort options"');
  });

  it("For You의 가짜 refresh/tag controls를 비상호작용 상태로 둔다", () => {
    const forYou = source("app/for-you/ForYouContent.tsx");
    expect(forYou).not.toContain("RefreshCcw");
    expect(forYou).not.toContain("cursor-pointer");
  });

  it("Try On의 전송되지 않는 height/weight 입력을 제거한다", () => {
    const tryOn = source("app/try-on/TryOnContent.tsx");
    expect(tryOn).not.toContain("Height (cm)");
    expect(tryOn).not.toContain("Weight (kg)");
  });

  it("상품 상세에서 미지원 포인트 적립 affordance를 제거한다", () => {
    expect(source("components/product/ProductDetailClient.tsx")).not.toContain("N pay");
  });
});
