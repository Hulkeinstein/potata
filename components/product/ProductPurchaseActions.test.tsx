import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductPurchaseActions } from "./ProductPurchaseActions";

const addItem = vi.fn();
vi.mock("@/store/cart-store", () => ({ useCartStore: () => ({ addItem }) }));
vi.mock("@/components/common/HeartButton", () => ({ HeartButton: () => <button aria-label="Like">Like</button> }));

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
  beforeEach(() => addItem.mockReset());

  it("수량을 변경하고 선택된 옵션과 수량을 cart에 전달한다", () => {
    render(<ProductPurchaseActions product={product as never} imageUrl="/jacket.jpg" />);
    fireEvent.click(screen.getByRole("button", { name: "M" }));
    fireEvent.click(screen.getByRole("button", { name: "수량 늘리기" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to Cart" }));
    expect(addItem).toHaveBeenCalledWith(expect.objectContaining({ quantity: 2, size: "M", color: "Black" }));
  });

  it("wishlist와 실제 링크 복사 동작을 제공한다", () => {
    render(<ProductPurchaseActions product={product as never} imageUrl="/jacket.jpg" />);
    expect(screen.getByRole("button", { name: "Like" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "상품 링크 복사" }));
    expect(screen.getByRole("status").textContent).toContain("지원하지 않습니다");
  });
});
