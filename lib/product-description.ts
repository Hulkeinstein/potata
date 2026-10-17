import type { Locale } from '@/lib/i18n/locale';

export const MAX_DESCRIPTION_LENGTH = 10000;
type DescriptionFields = {
  readonly description?: string | null;
  readonly descriptionKo?: string | null;
  readonly descriptionEn?: string | null;
};
export function parseDescriptionField(value: unknown): { readonly valid: true; readonly value: string | null } | { readonly valid: false } {
  if (value === null || value === undefined) return { valid: true, value: null };
  if (typeof value !== 'string' || value.length > MAX_DESCRIPTION_LENGTH) return { valid: false };
  return { valid: true, value: value.trim() || null };
}
export function resolveProductDescription(product: DescriptionFields, locale: Locale) {
  const requested = locale === 'ko' ? product.descriptionKo : product.descriptionEn;
  const other = locale === 'ko' ? product.descriptionEn : product.descriptionKo;
  if (requested?.trim()) return { text: requested, language: locale, fallback: false };
  if (other?.trim()) return { text: other, language: locale === 'ko' ? 'en' as const : 'ko' as const, fallback: true };
  if (product.description?.trim()) return { text: product.description, language: null, fallback: true };
  return { text: null, language: null, fallback: false };
}
