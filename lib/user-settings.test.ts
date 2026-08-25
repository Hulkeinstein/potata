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
});
