'use client';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { getCommerceMessages } from '@/lib/i18n/commerce-messages';
import type { OrderStatus } from '@/types';

export function CommerceText({ name }: { readonly name: keyof ReturnType<typeof getCommerceMessages> }) {
  return getCommerceMessages(useLanguage().locale)[name];
}
export function OrderStatusText({ status }: { readonly status: OrderStatus }) {
  const text = getCommerceMessages(useLanguage().locale);
  const labels = { PENDING: text.pending, PAID: text.paid, CANCELLED: text.cancelled };
  return labels[status];
}
export function OrderDate({ date }: { readonly date: string }) {
  const { locale } = useLanguage();
  return `${new Date(date).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;
}
