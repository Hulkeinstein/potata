export type Locale = 'en' | 'ko';
export const LANGUAGE_COOKIE = 'potata-language';
export function parseLocale(value: unknown): Locale {
  return value === 'ko' ? 'ko' : 'en';
}
export function languageCookie(locale: Locale, secure: boolean): string {
  return `${LANGUAGE_COOKIE}=${locale}; Path=/; SameSite=Lax; Max-Age=31536000${secure ? '; Secure' : ''}`;
}
