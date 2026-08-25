import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminProductForm } from "./AdminProductForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { readonly children: React.ReactNode }) => <>{children}</>,
  motion: { div: ({ children }: { readonly children: React.ReactNode }) => <div>{children}</div> },
}));

describe("AdminProductForm 옵션별 초기 재고", () => {
  it("사이즈·컬러 조합별 수량 입력을 기본값 5로 표시하고 독립 수정한다", () => {
    render(<AdminProductForm />);

    fireEvent.change(screen.getByLabelText("사이즈 (콤마 구분)"), { target: { value: "S, M" } });
    fireEvent.change(screen.getByLabelText("컬러 (콤마 구분)"), { target: { value: "Black" } });

    const small = screen.getByLabelText("Black / S 초기 재고") as HTMLInputElement;
    const medium = screen.getByLabelText("Black / M 초기 재고") as HTMLInputElement;
    expect(small.value).toBe("5");
    expect(medium.value).toBe("5");

    fireEvent.change(small, { target: { value: "2" } });
    expect((screen.getByLabelText("Black / S 초기 재고") as HTMLInputElement).value).toBe("2");
    expect((screen.getByLabelText("Black / M 초기 재고") as HTMLInputElement).value).toBe("5");
  });
});
