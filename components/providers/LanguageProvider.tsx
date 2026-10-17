'use client';
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { languageCookie } from '@/lib/i18n/locale';
import type { Locale } from '@/lib/i18n/locale';

type LanguageContextValue = {
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => void;
};
const LanguageContext = createContext<LanguageContextValue>({ locale: 'en', setLocale: () => undefined });
export function LanguageProvider({ initialLocale, children }: { readonly initialLocale: Locale; readonly children: ReactNode }) {
  const [locale, updateLocale] = useState(initialLocale);
  const setLocale = (next: Locale) => {
    document.cookie = languageCookie(next, window.location.protocol === 'https:');
    document.documentElement.lang = next;
    updateLocale(next);
  };
  return <LanguageContext.Provider value={{ locale, setLocale }}>{children}</LanguageContext.Provider>;
}
export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
