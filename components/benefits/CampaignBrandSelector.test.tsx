import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CampaignBrandSelector } from "./CampaignBrandSelector";

describe("CampaignBrandSelector", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("검색 결과를 선택한다 when 관리자가 일치 브랜드 전체를 선택한다", () => {
    // 검색어는 150ms debounce 뒤에 반영된다. 실제 시간으로 기다리면 전체 테스트가 몰릴 때 화면 갱신이
    // 늦어 걸러지지 않은 3개가 선택되는 일이 있었다 → 가짜 타이머로 시간을 진행하고 act 로 갱신을 끝낸다.
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<CampaignBrandSelector brands={["Potata", "Potato Lab", "Seoul Style"]} selected={[]} onChange={onChange}/>);
    fireEvent.change(screen.getByLabelText("브랜드 검색"), { target: { value: "pot" } });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.queryByText("Seoul Style")).toBeNull();
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
