'use client';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { parseLocale } from '@/lib/i18n/locale';

export function LanguageSelect() {
  const { locale, setLocale } = useLanguage();
  return <label className="flex items-center gap-3 text-xs">Language / 언어
    <select value={locale} onChange={event => setLocale(parseLocale(event.target.value))} className="min-h-11 rounded-md border border-white/20 bg-zinc-900 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-neon">
      <option value="en" lang="en">English</option><option value="ko" lang="ko">한국어</option>
    </select>
  </label>;
}
