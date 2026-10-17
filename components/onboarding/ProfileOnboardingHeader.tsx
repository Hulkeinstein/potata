"use client";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { onboardingMessages } from "@/lib/i18n/onboarding-messages";
export function ProfileOnboardingHeader() {
  const { locale } = useLanguage(); const t = onboardingMessages[locale];
  return <header className="mb-8"><p className="text-sm font-bold tracking-[0.3em] text-brand-neon">POTATA</p><h1 className="mt-3 text-3xl font-black">{t.heading}</h1><p className="mt-2 text-zinc-400">{t.introduction}</p></header>;
}
