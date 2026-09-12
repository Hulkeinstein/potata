import { validateHandle } from "./handle";
import { normalizeName } from "./normalize";
import { parseUserSettingsPatch, type UserSettingsPatch } from "./user-settings";

export const LEGAL_VERSION = "draft-2026-09-01" as const;
export const LEGAL_LOCALE = "en-AE" as const;

export type OnboardingInput = {
  readonly name: string;
  readonly handle: string;
  readonly settings: UserSettingsPatch;
  readonly termsVersion: typeof LEGAL_VERSION;
  readonly privacyVersion: typeof LEGAL_VERSION;
  readonly marketingAccepted: boolean;
};

export type OnboardingParseResult =
  | { readonly ok: true; readonly value: OnboardingInput }
  | { readonly ok: false; readonly error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseSafeReturnTo(value: string | null | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/";
  const pathname = value.split(/[?#]/, 1)[0] ?? "/";
  if (pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/onboarding")) return "/";
  return value;
}

export function parseOnboardingInput(value: unknown): OnboardingParseResult {
  if (!isRecord(value)) return { ok: false, error: "온보딩 형식이 올바르지 않습니다." };
  const allowed = new Set(["name", "handle", "preferredSize", "aiCoordinatorEnabled", "heightCm", "weightKg", "termsVersion", "privacyVersion", "termsAccepted", "privacyAccepted", "marketingAccepted"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) return { ok: false, error: "지원하지 않는 항목입니다." };
  const name = normalizeName(typeof value.name === "string" ? value.name : "");
  if (name.length < 2 || name.length > 50) return { ok: false, error: "표시 이름은 2~50자로 입력해주세요." };
  const handle = validateHandle(typeof value.handle === "string" ? value.handle : "");
  if (!handle.ok) return { ok: false, error: `핸들: ${handle.error}` };
  if (value.termsAccepted !== true || value.privacyAccepted !== true) return { ok: false, error: "필수 약관과 개인정보 처리방침에 동의해주세요." };
  if (value.termsVersion !== LEGAL_VERSION || value.privacyVersion !== LEGAL_VERSION) return { ok: false, error: "최신 약관을 다시 확인해주세요." };
  if (typeof value.marketingAccepted !== "boolean") return { ok: false, error: "마케팅 동의 형식이 올바르지 않습니다." };
  const settings = parseUserSettingsPatch({ preferredSize: value.preferredSize ?? null, aiCoordinatorEnabled: value.aiCoordinatorEnabled ?? true, heightCm: value.heightCm ?? null, weightKg: value.weightKg ?? null });
  if (!settings.ok) return settings;
  return { ok: true, value: { name, handle: handle.value, settings: settings.value, termsVersion: LEGAL_VERSION, privacyVersion: LEGAL_VERSION, marketingAccepted: value.marketingAccepted } };
}

export function isLegalSignupReady(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.LEGAL_DOCS_PRODUCTION_READY === "true" && Boolean(process.env.LEGAL_ENTITY_NAME && process.env.LEGAL_CONTACT_EMAIL);
}
