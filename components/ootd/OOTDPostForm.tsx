"use client";
import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { ProductTagPicker } from "./ProductTagPicker";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { socialError, socialMessages } from "@/lib/i18n/social-messages";
import type { ApiResponse, Product } from "@/types";
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGES = 5;
const MAX_SIZE = 5 * 1024 * 1024;
export function OOTDPostForm({
  products,
  onClose,
  onPosted,
}: {
  products: Product[];
  onClose: () => void;
  onPosted: () => void;
}) {
  const { locale } = useLanguage();
  const t = socialMessages[locale];
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const picked = Array.from(e.target.files ?? []);
    if (picked.length > MAX_IMAGES) {
      setError(t.maxImages);
      return;
    }
    for (const f of picked) {
      if (!ALLOWED.includes(f.type)) {
        setError(t.imageType);
        return;
      }
      if (f.size > MAX_SIZE) {
        setError(t.imageSize);
        return;
      }
    }
    setFiles(picked);
  };

  const submit = async () => {
    if (files.length === 0) {
      setError(t.imageRequired);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("images", f));
      if (caption.trim()) fd.append("caption", caption.trim());
      selected.forEach((id) => fd.append("productIds", id));

      const res = await fetch("/api/ootd", { method: "POST", body: fd });
      const data = (await res.json()) as ApiResponse<{ id: string }>;
      if (res.ok && data.success) {
        onPosted();
      } else {
        setError(t.postFailed);
      }
    } catch {
      setError(t.network);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-catalog-refresh-blocked="true"
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[85vh] overflow-y-auto bg-cinematic-800 border border-white/10 rounded-2xl p-6"
      >
        <button
          onClick={onClose}
          aria-label={t.close}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-4">{t.postLook}</h2>

        {/* 파일 선택 */}
        <label className="block mb-4">
          <span className="text-sm text-zinc-300 font-medium">{t.photos}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={onFileChange}
            className="mt-2 block w-full text-sm text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white file:text-black file:font-bold file:text-xs hover:file:bg-gray-200"
          />
          {files.length > 0 && (
            <p className="text-xs text-brand-neon mt-2">{files.length} {t.selected}</p>
          )}
        </label>

        {/* 캡션 */}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={t.caption}
          aria-label={t.caption}
          rows={2}
          className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white mb-4 focus:outline-none focus:border-purple-500"
        />

        {/* 상품 태그 — 검색 + 최근 구매 + 썸네일 그리드 */}
        <div className="mb-5">
          <span className="text-sm text-zinc-300 font-medium mb-2 block">{t.tags}</span>
          <ProductTagPicker products={products} selected={selected} onChange={setSelected} />
        </div>

        {error && (
          <p className="text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2 mb-3">{socialError(error, locale)}</p>
        )}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full py-3 bg-brand-neon text-black font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-white transition-colors disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {submitting ? t.posting : t.post}
        </button>
      </div>
    </div>
  );
}
