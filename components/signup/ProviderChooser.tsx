"use client";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { authMessages } from "@/lib/i18n/auth-messages";
import { Mail } from "lucide-react";
import { signIn } from "next-auth/react";
export function ProviderChooser({ onEmail }: { readonly onEmail: () => void }) {
  const { locale } = useLanguage(); const t = authMessages[locale];
  return <div className="space-y-3"><p className="mb-6 text-center text-sm text-zinc-400">{t.providerHint}</p><button type="button" onClick={() => signIn("google", { callbackUrl: "/onboarding/profile" }, { prompt: "select_account" })} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white font-bold text-black"><span className="text-lg">G</span> {t.google}</button><button type="button" disabled title={t.comingSoon} className="flex h-12 w-full cursor-not-allowed items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 font-bold text-white/50">{t.apple}</button><div className="mt-6 border-t border-white/10 pt-4"><button type="button" onClick={onEmail} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/5 bg-zinc-800/50 font-medium text-zinc-300"><Mail className="h-4 w-4" /> {t.emailSignup}</button></div></div>;
}
