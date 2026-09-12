export type UserSettingsData = {
  readonly preferredSize: string | null;
  readonly aiCoordinatorEnabled: boolean;
  readonly heightCm: number | null;
  readonly weightKg: number | null;
};

const MAX_SIZE_LENGTH = 20;
export const PREFERRED_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Free"] as const;

function isPreferredSize(value: string): value is (typeof PREFERRED_SIZES)[number] {
  return PREFERRED_SIZES.some((size) => size === value);
}

export type UserSettingsPatch = {
  readonly preferredSize?: string | null;
  readonly aiCoordinatorEnabled?: boolean;
  readonly heightCm?: number | null;
  readonly weightKg?: number | null;
};

export type UserSettingsParseResult =
  | { readonly ok: true; readonly value: UserSettingsPatch }
  | { readonly ok: false; readonly error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseUserSettingsPatch(value: unknown): UserSettingsParseResult {
  if (!isRecord(value)) return { ok: false, error: "설정 형식이 올바르지 않습니다." };
  const allowedKeys = new Set(["preferredSize", "aiCoordinatorEnabled", "heightCm", "weightKg"]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    return { ok: false, error: "지원하지 않는 설정 항목입니다." };
  }
  const patch: { preferredSize?: string | null; aiCoordinatorEnabled?: boolean; heightCm?: number | null; weightKg?: number | null } = {};
  if ("preferredSize" in value) {
    if (value.preferredSize === null || value.preferredSize === "") {
      patch.preferredSize = null;
    } else if (typeof value.preferredSize === "string") {
      const size = value.preferredSize.trim();
      if (!size || size.length > MAX_SIZE_LENGTH || !isPreferredSize(size)) {
        return { ok: false, error: "지원하지 않는 선호 사이즈입니다." };
      }
      patch.preferredSize = size;
    } else {
      return { ok: false, error: "선호 사이즈 형식이 올바르지 않습니다." };
    }
  }
  if ("aiCoordinatorEnabled" in value) {
    if (typeof value.aiCoordinatorEnabled !== "boolean") return { ok: false, error: "AI 코디 설정 형식이 올바르지 않습니다." };
    patch.aiCoordinatorEnabled = value.aiCoordinatorEnabled;
  }
  for (const [key, min, max, label] of [["heightCm", 100, 250, "키"], ["weightKg", 25, 300, "몸무게"]] as const) {
    if (!(key in value)) continue;
    const measurement = value[key];
    if (measurement === null || measurement === "") patch[key] = null;
    else if (typeof measurement === "number" && Number.isFinite(measurement) && measurement >= min && measurement <= max) patch[key] = measurement;
    else return { ok: false, error: `${label}는 ${min}~${max} 범위의 숫자로 입력해주세요.` };
  }
  if (Object.keys(patch).length === 0) return { ok: false, error: "변경할 설정이 없습니다." };
  return { ok: true, value: patch };
}

export function toUserSettingsData(value: UserSettingsData | null): UserSettingsData {
  return value ?? { preferredSize: null, aiCoordinatorEnabled: true, heightCm: null, weightKg: null };
}
