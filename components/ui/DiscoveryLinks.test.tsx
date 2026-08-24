import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BrandsContent } from "@/app/brands/BrandsContent";
import { RankingContent } from "@/app/ranking/RankingContent";
import { K_TrendSection } from "./K_TrendSection";

vi.mock("next/image", () => ({ default: ({ alt }: { readonly alt: string }) => <span role="img" aria-label={alt} /> }));
vi.mock("next/link", () => ({ default: ({ children, href }: { readonly children: React.ReactNode; readonly href: string }) => <a href={href}>{children}</a> }));

const product = { id: "p1", name: "Jacket", brand: "Potata", price: 100, imageUrl: "/jacket.jpg" };

describe("discovery links", () => {
  it("K-Trend 카드를 기존 검색 route로 연결한다", () => {
    render(<K_TrendSection />);
    expect(screen.getByRole("link", { name: /Gorpcore Essentials/ }).getAttribute("href")).toBe("/search?q=Gorpcore%20Essentials");
  });

  it("Ranking 상품을 상세 route로 연결하고 quick-add 가짜 버튼을 제거한다", () => {
    render(<RankingContent products={[product] as never} />);
    expect(screen.getByRole("link", { name: /Jacket/ }).getAttribute("href")).toBe("/product/p1");
    expect(screen.queryByText("+", { exact: true })).toBeNull();
  });

  it("draggable 브랜드 카드에서는 명시 CTA만 검색 route로 연결한다", () => {
    render(<BrandsContent products={[product] as never} />);
    const brandLinks = screen.getAllByRole("link", { name: "View brand products" });
    expect(brandLinks[0].getAttribute("href")).toBe("/search?q=YOSEMITE");
    expect(screen.getByRole("link", { name: /Jacket/ }).getAttribute("href")).toBe("/product/p1");
  });
});
