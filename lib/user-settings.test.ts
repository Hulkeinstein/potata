import { describe, expect, it } from "vitest";
import { parseUserSettingsPatch } from "./user-settings";

describe("parseUserSettingsPatch", () => {
  it("지원되는 설정만 파싱한다", () => {
    expect(parseUserSettingsPatch({ preferredSize: " M ", aiCoordinatorEnabled: false })).toEqual({ ok: true, value: { preferredSize: "M", aiCoordinatorEnabled: false } });
  });

  it("알 수 없는 필드를 거부한다", () => {
    expect(parseUserSettingsPatch({ preferredSize: "M", userId: "other" })).toEqual({ ok: false, error: "지원하지 않는 설정 항목입니다." });
  });

  it("지원하지 않는 사이즈를 거부한다", () => {
    expect(parseUserSettingsPatch({ preferredSize: "CUSTOM" })).toEqual({ ok: false, error: "지원하지 않는 선호 사이즈입니다." });
  });

  it("키와 몸무게를 metric 범위 안에서 파싱한다", () => {
    expect(parseUserSettingsPatch({ heightCm: 170.5, weightKg: 62.3 })).toEqual({ ok: true, value: { heightCm: 170.5, weightKg: 62.3 } });
  });

  it("빈 측정값을 null로 지운다", () => {
    expect(parseUserSettingsPatch({ heightCm: "", weightKg: null })).toEqual({ ok: true, value: { heightCm: null, weightKg: null } });
  });

  it.each([{ heightCm: 99 }, { heightCm: 251 }, { heightCm: "170" }, { weightKg: 24 }, { weightKg: 301 }, { weightKg: Number.NaN }])("범위 밖 또는 숫자가 아닌 측정값을 거부한다", (value) => {
    expect(parseUserSettingsPatch(value)).toMatchObject({ ok: false });
  });
});
