import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminInventoryProductThumbnail } from "@/components/admin/AdminInventoryProductThumbnail";

describe("AdminInventoryProductThumbnail", () => {
  it("shows a readable fallback when the product image fails to load", () => {
    // Given: a product thumbnail with an unreachable external image
    render(<AdminInventoryProductThumbnail imageUrl="https://example.test/missing.png" productName="테스트 재킷" />);

    // When: the browser reports an image loading error
    fireEvent.error(screen.getByAltText("테스트 재킷 상품 이미지"));

    // Then: the operator still sees a clear visual fallback
    expect(screen.getByText("이미지 없음")).toBeTruthy();
  });
});
