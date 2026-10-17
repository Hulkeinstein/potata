"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { onboardingMessages, onboardingErrorKey, type OnboardingMessageKey } from "@/lib/i18n/onboarding-messages";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export function ProfilePhotoField({ avatar, onAvatarChange }: { readonly avatar: string | null; readonly onAvatarChange: (avatar: string | null) => void }) {
  const { locale } = useLanguage(); const t = onboardingMessages[locale];
  const { update: updateSession } = useSession();
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<OnboardingMessageKey | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  async function upload(file: File) {
    setBusy(true); setError(null);
    const body = new FormData(); body.set("image", file);
    try {
      const response = await fetch("/api/users/me/avatar", { method: "POST", body });
      const result = (await response.json()) as { readonly success: boolean; readonly data?: { readonly avatar: string | null }; readonly error?: string };
      if (!response.ok || !result.success || !result.data) return setError(onboardingErrorKey(result.error, "uploadError"));
      onAvatarChange(result.data.avatar); setPreview(null); await updateSession({ refreshProfile: true });
    } catch (caught) { if (caught instanceof SyntaxError) setError("responseError"); else if (caught instanceof TypeError) setError("network"); else throw caught; }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/users/me/avatar", { method: "DELETE" });
      const result = (await response.json()) as { readonly success: boolean; readonly error?: string };
      if (!response.ok || !result.success) return setError(onboardingErrorKey(result.error, "deleteError"));
      onAvatarChange(null); setPreview(null); await updateSession({ refreshProfile: true });
    } catch (caught) { if (caught instanceof SyntaxError) setError("responseError"); else if (caught instanceof TypeError) setError("network"); else throw caught; }
    finally { setBusy(false); }
  }
  const src = preview ?? avatar;
  return <section><p className="text-xs font-semibold uppercase tracking-widest text-brand-neon">{t.photo}</p><div className="mt-3 flex flex-wrap items-center gap-4">{src ? <Image src={src} alt={t.preview} width={88} height={88} unoptimized className="size-22 rounded-full border border-white/15 object-cover" /> : <div aria-label={t.noPhoto} className="grid size-22 place-items-center rounded-full border border-dashed border-white/20 bg-white/[0.03] text-2xl text-zinc-500">P</div>}<div className="flex flex-1 flex-wrap gap-2"><label className="cursor-pointer rounded-xl border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5">{busy ? t.uploading : t.choosePhoto}<input aria-label={t.choosePhotoAria} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className="sr-only" onChange={(event) => { const next = event.target.files?.[0] ?? null; if (!next) return; if (preview) URL.revokeObjectURL(preview); setPreview(URL.createObjectURL(next)); setError(null); void upload(next); event.target.value = ""; }} /></label>{avatar && <button type="button" onClick={() => void remove()} disabled={busy} className="rounded-xl border border-red-400/30 px-4 py-2 text-sm text-red-300 disabled:opacity-50">{t.deletePhoto}</button>}</div></div><p className="mt-2 text-xs text-zinc-500">{t.photoHint}</p>{error && <p role="alert" className="mt-2 text-sm text-red-300">{t[error]}</p>}</section>;
}
