import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CampaignBrandSelector } from "./CampaignBrandSelector";

describe("CampaignBrandSelector", () => {
  it("검색 결과를 선택한다 when 관리자가 일치 브랜드 전체를 선택한다", async () => {
    const onChange = vi.fn();
    render(<CampaignBrandSelector brands={["Potata", "Potato Lab", "Seoul Style"]} selected={[]} onChange={onChange}/>);
    fireEvent.change(screen.getByLabelText("브랜드 검색"), { target: { value: "pot" } });
    await new Promise((resolve) => setTimeout(resolve, 200));
    fireEvent.click(screen.getByRole("button", { name: "검색 결과 모두 선택" }));
    expect(onChange).toHaveBeenCalledWith(["Potata", "Potato Lab"]);
  });

  it("선택 브랜드를 제거한다 when 칩을 누른다", () => {
    const onChange = vi.fn();
    render(<CampaignBrandSelector brands={["Potata"]} selected={["Potata"]} onChange={onChange}/>);
    fireEvent.click(screen.getByRole("button", { name: "Potata ×" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
