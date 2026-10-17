'use client';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { studioMessages } from '@/lib/i18n/studio-messages';
export function StudioLoading() {
  const { locale } = useLanguage();
  return <div className="min-h-screen bg-black text-white flex items-center justify-center">{studioMessages[locale].loading}</div>;
}
