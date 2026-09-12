"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function ProfilePhotoField({ avatar, onAvatarChange }: { readonly avatar: string | null; readonly onAvatarChange: (avatar: string | null) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  async function upload() {
    if (!file) return;
    setBusy(true); setError("");
    const body = new FormData(); body.set("image", file);
    try {
      const response = await fetch("/api/users/me/avatar", { method: "POST", body });
      const result = (await response.json()) as { readonly success: boolean; readonly data?: { readonly avatar: string | null }; readonly error?: string };
      if (!response.ok || !result.success || !result.data) return setError(result.error ?? "사진을 업로드하지 못했습니다.");
      onAvatarChange(result.data.avatar); setFile(null); setPreview(null);
    } catch (caught) { if (caught instanceof SyntaxError) setError("서버 응답을 확인할 수 없습니다. 다시 시도해 주세요."); else if (caught instanceof TypeError) setError("서버와 연결할 수 없습니다."); else throw caught; }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/users/me/avatar", { method: "DELETE" });
      const result = (await response.json()) as { readonly success: boolean; readonly error?: string };
      if (!response.ok || !result.success) return setError(result.error ?? "사진을 삭제하지 못했습니다.");
      onAvatarChange(null); setFile(null); setPreview(null);
    } catch (caught) { if (caught instanceof SyntaxError) setError("서버 응답을 확인할 수 없습니다. 다시 시도해 주세요."); else if (caught instanceof TypeError) setError("서버와 연결할 수 없습니다."); else throw caught; }
    finally { setBusy(false); }
  }
  const src = preview ?? avatar;
  return <section><p className="text-xs font-semibold uppercase tracking-widest text-brand-neon">프로필 사진 · 선택</p><div className="mt-3 flex flex-wrap items-center gap-4">{src ? <Image src={src} alt="프로필 사진 미리보기" width={88} height={88} unoptimized className="size-22 rounded-full border border-white/15 object-cover" /> : <div aria-label="프로필 사진 없음" className="grid size-22 place-items-center rounded-full border border-dashed border-white/20 bg-white/[0.03] text-2xl text-zinc-500">P</div>}<div className="flex flex-1 flex-wrap gap-2"><label className="cursor-pointer rounded-xl border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5">사진 선택<input aria-label="프로필 사진 선택" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const next = event.target.files?.[0] ?? null; if (preview) URL.revokeObjectURL(preview); setFile(next); setPreview(next ? URL.createObjectURL(next) : null); setError(""); }} /></label>{file && <button type="button" onClick={() => void upload()} disabled={busy} className="rounded-xl bg-brand-neon px-4 py-2 text-sm font-bold text-black disabled:opacity-50">{busy ? "업로드 중..." : "사진 업로드"}</button>}{avatar && <button type="button" onClick={() => void remove()} disabled={busy} className="rounded-xl border border-red-400/30 px-4 py-2 text-sm text-red-300 disabled:opacity-50">사진 삭제</button>}</div></div><p className="mt-2 text-xs text-zinc-500">JPG, PNG, WEBP · 최대 5MB</p>{error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}</section>;
}
