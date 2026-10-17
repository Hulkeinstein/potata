import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductPurchaseActions } from "./ProductPurchaseActions";

const addItem = vi.fn();
const sessionState = vi.hoisted(() => ({ status: "authenticated" }));
const language = vi.hoisted(() => ({ locale: "en" as "en" | "ko" }));
vi.mock("@/components/providers/LanguageProvider", () => ({ useLanguage: () => language }));
vi.mock("@/store/cart-store", () => ({ useCartStore: () => ({ addItem }) }));
vi.mock("@/components/common/HeartButton", () => ({ HeartButton: () => <button aria-label="Like">Like</button> }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ status: sessionState.status }) }));

const product = {
  id: "p1",
  name: "Jacket",
  brand: "Potata",
  price: 120,
  imageUrl: "/jacket.jpg",
  category: "Outer",
  sizes: ["S", "M"],
  colors: ["Black"],
};

describe("ProductPurchaseActions", () => {
  beforeEach(() => {
    language.locale = "en";
    sessionState.status = "authenticated";
    addItem.mockReset();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { preferredSize: null, aiCoordinatorEnabled: true } }),
    }));
  });

  it("설정 API를 호출하지 않는다 when 사용자가 로그인하지 않았다", () => {
    sessionState.status = "unauthenticated";
    render(<ProductPurchaseActions product={product as never} imageUrl="/jacket.jpg" />);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("수량을 변경하고 선택된 옵션과 수량을 cart에 전달한다", () => {
    render(<ProductPurchaseActions product={product as never} imageUrl="/jacket.jpg" />);
    fireEvent.click(screen.getByRole("button", { name: "M" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to Cart" }));
    expect(addItem).toHaveBeenCalledWith(expect.objectContaining({ quantity: 2, size: "M", color: "Black" }));
  });

  it("수동 품절 옵션은 재고가 남아도 장바구니에 담지 않는다", () => {
    render(<ProductPurchaseActions product={{ ...product, variants: [{ id: "v1", size: "S", color: "Black", stock: 5, isManuallySoldOut: true }, { id: "v2", size: "M", color: "Black", stock: 5, isManuallySoldOut: true }] } as never} imageUrl="/jacket.jpg" />);
    expect(screen.getByRole("button", { name: "Sold Out" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Sold Out" }));
    expect(addItem).not.toHaveBeenCalled();
  });

  it("wishlist와 실제 링크 복사 동작을 제공한다", () => {
    render(<ProductPurchaseActions product={product as never} imageUrl="/jacket.jpg" />);
    expect(screen.getByRole("button", { name: "Like" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Copy product link" }));
    expect(screen.getByRole("status").textContent).toContain("does not support");
  });

  it("updates action labels and existing feedback when the language changes without resetting quantity", () => {
    const { rerender } = render(<ProductPurchaseActions product={product as never} imageUrl="/jacket.jpg" />);
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to Cart" }));
    expect(screen.getByRole("status").textContent).toBe("Please select a size.");
    language.locale = "ko";
    rerender(<ProductPurchaseActions product={product as never} imageUrl="/jacket.jpg" />);
    expect(screen.getByRole("status").textContent).toBe("사이즈를 선택해 주세요.");
    fireEvent.click(screen.getByRole("button", { name: "M" }));
    fireEvent.click(screen.getByRole("button", { name: "장바구니 담기" }));
    expect(addItem).toHaveBeenCalledWith(expect.objectContaining({ quantity: 2 }));
  });

  it("retains the stock ceiling when Korean controls change quantity", () => {
    language.locale = "ko";
    render(<ProductPurchaseActions product={{ ...product, variants: [{ id: "v1", size: "S", color: "Black", stock: 2, isManuallySoldOut: false }] } as never} imageUrl="/jacket.jpg" />);
    fireEvent.click(screen.getByRole("button", { name: "S" }));
    fireEvent.click(screen.getByRole("button", { name: "수량 늘리기" }));
    expect(screen.getByRole("button", { name: "수량 늘리기" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "장바구니 담기" }));
    expect(screen.getByRole("status").textContent).toBe("2개를 장바구니에 담았습니다.");
  });

  it("실제 치수 데이터가 있을 때만 Size Guide를 열어 표를 표시한다", () => {
    const productWithGuide = {
      ...product,
      sizeGuide: {
        version: 1,
        measurementType: "garment",
        unit: "cm",
        columns: [
          { key: "chest", label: "가슴 단면" },
          { key: "length", label: "총장" },
        ],
        rows: [
          { size: "S", measurements: { chest: 52, length: 68 } },
          { size: "M", measurements: { chest: 55, length: 70 } },
        ],
        note: "상품을 평평하게 놓고 측정한 단면 기준입니다.",
      },
    };

    const { rerender } = render(<ProductPurchaseActions product={product as never} imageUrl="/jacket.jpg" />);
    expect(screen.queryByRole("button", { name: "Size Guide" })).toBeNull();

    rerender(<ProductPurchaseActions product={productWithGuide as never} imageUrl="/jacket.jpg" />);
    fireEvent.click(screen.getByRole("button", { name: "Size Guide" }));
    expect(screen.getByRole("dialog", { name: "Jacket Size Guide" })).toBeTruthy();
    expect(screen.getByText("Jacket · Garment measurements")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "가슴 단면" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "55" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "in" }));
    expect(screen.getByRole("cell", { name: "21.7" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Size Guide" }));
    language.locale = "ko";
    rerender(<ProductPurchaseActions product={productWithGuide as never} imageUrl="/jacket.jpg" />);
    fireEvent.click(screen.getByRole("button", { name: "사이즈 안내" }));
    expect(screen.getByRole("dialog", { name: "Jacket 사이즈 안내" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "사이즈 안내 닫기" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "가슴 단면" })).toBeTruthy();
  });
});
