'use client';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { accountMessage } from '@/lib/i18n/account-messages';
export function useAccountMessage() { const { locale } = useLanguage(); return (source: string) => accountMessage(locale, source); }
export function AccountText({ source }: { readonly source: string }) { const t = useAccountMessage(); return <>{t(source)}</>; }
export function useAccountDateLocale() { const { locale } = useLanguage(); return locale === 'ko' ? 'ko-KR' : 'en-GB'; }
