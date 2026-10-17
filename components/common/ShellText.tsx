'use client';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { getShellMessages } from '@/lib/i18n/shell-messages';
export function ShellText({ name }: { readonly name: keyof ReturnType<typeof getShellMessages> }) {
  return getShellMessages(useLanguage().locale)[name];
}
