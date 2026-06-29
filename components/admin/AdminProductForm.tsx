"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X } from "lucide-react";
import type { ApiResponse, AdminProductCreateData, ProductCategory } from "@/types";

// 'All' 제외 6종 카테고리
const CATEGORIES: Exclude<ProductCategory, "All">[] = [
  "Outer",
  "Top",
  "Bottom",
  "Dress",
  "Acc",
  "Shoes",
];

const CATEGORY_LABELS: Record<Exclude<ProductCategory, "All">, string> = {
  Outer: "아우터 (Outer)",
  Top: "상의 (Top)",
  Bottom: "하의 (Bottom)",
  Dress: "드레스 (Dress)",
  Acc: "액세서리 (Acc)",
  Shoes: "신발 (Shoes)",
};

/**
 * 관리자 상품 등록 폼 (클라이언트 컴포넌트)
 * - POST /api/admin/products (multipart/form-data) 경유 — 서버 전용 모듈 직접 import 금지
 * - submitting 상태로 더블서밋 방지
 * - 성공 시 /product/[id]로 이동해 등록 상품 즉시 확인
 */
export function AdminProductForm() {
  const router = useRouter();

  // 필수 필드
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState<Exclude<ProductCategory, "All"> | "">("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // 가격 필드: 정가(필수) + 할인율(선택) → 판매가 자동 계산
  const [originalPrice, setOriginalPrice] = useState("");
  const [discountRate, setDiscountRate] = useState("");

  // 판매가 자동 계산 — 정가·할인율 변경 시마다 즉시 반영
  const listPrice = Number.parseInt(originalPrice, 10);
  const rate = discountRate ? Number.parseInt(discountRate, 10) : 0;
  const salePrice =
    Number.isInteger(listPrice) && listPrice > 0
      ? rate > 0
        ? Math.round(listPrice * (1 - rate / 100))
        : listPrice
      : null;

  // 선택 필드
  const [description, setDescription] = useState("");
  const [sizes, setSizes] = useState("");
  const [colors, setColors] = useState("");
  // 태그 칩
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  // 제출 상태
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // 동기 더블서밋 락 — state는 비동기 갱신이라 같은 tick 연타를 막지 못함
  const submittingRef = useRef(false);

  // 이미지 선택 핸들러 — 미리보기 생성
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    setImageFile(file);
    // 이미지 미리보기 — revoke는 아래 useEffect cleanup에서 처리
    setImagePreview(URL.createObjectURL(file));
  };

  // 이미지 미리보기 objectURL 메모리 해제 — 변경 시 이전 것, 언마운트 시 현재 것 revoke
  useEffect(() => {
    if (!imagePreview) return;
    return () => URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  // 태그 칩 핸들러
  const addTag = () => {
    const t = tagInput.trim();
    if (!t || t.length > 20) return;           // 빈값·20자 가드
    if (tags.includes(t)) { setTagInput(""); return; } // 중복 방지
    if (tags.length >= 10) return;             // 최대 10개
    setTags([...tags, t]);
    setTagInput("");
  };
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      setTags(tags.slice(0, -1)); // 빈 input에서 backspace → 마지막 칩 제거
    }
  };
  const removeTag = (idx: number) => setTags(tags.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 동기 락 — 같은 tick 연타 차단(state는 비동기라 stale false를 읽을 수 있음)
    if (submittingRef.current) return;

    // 클라이언트 사전 검증(보조 — 서버가 정본) — 락 획득 전이므로 실패 시 재시도 허용
    if (!imageFile) {
      setError("상품 이미지를 선택해주세요.");
      return;
    }
    // 판매가 검증: 정가 미입력 또는 계산 결과가 1 미만이면 차단
    if (salePrice == null || salePrice < 1) {
      setError("정가/할인율을 확인해주세요(판매가는 1 이상).");
      return;
    }

    submittingRef.current = true; // 락 획득(동기)
    setSubmitting(true);          // UI용 상태
    setError(null);

    try {
      const fd = new FormData();
      // 필수 필드 — price는 자동 계산된 판매가(salePrice)를 전송
      fd.append("name", name.trim());
      fd.append("brand", brand.trim());
      fd.append("price", String(salePrice));
      fd.append("category", category);
      fd.append("image", imageFile);

      // 할인이 있을 때만 정가·할인율 전송 (0% 할인이면 미전송 — 가짜 할인 표시 방지)
      if (rate > 0) {
        fd.append("originalPrice", String(listPrice));
        fd.append("discountRate", String(rate));
      }

      // 선택 필드 — 값이 있을 때만 append
      if (description.trim()) fd.append("description", description.trim());
      if (sizes.trim()) fd.append("sizes", sizes.trim());
      if (colors.trim()) fd.append("colors", colors.trim());
      tags.forEach((t) => fd.append("tags", t));
      const res = await fetch("/api/admin/products", {
        method: "POST",
        body: fd,
      });

      const data = (await res.json()) as ApiResponse<AdminProductCreateData>;

      if (res.ok && data.success && data.data) {
        // 성공 → 상품 상세 페이지로 이동해 즉시 확인
        router.push(`/product/${data.data.id}`);
      } else {
        setError(data.error ?? "상품 등록에 실패했습니다.");
      }
    } catch {
      setError("서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-black font-outfit tracking-tighter text-white">
          상품 등록
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          새 상품을 카탈로그에 등록합니다. * 표시는 필수 항목입니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 필수 필드 카드 */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
          <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-4">
            기본 정보 *
          </h2>

          {/* 상품명 */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-400 font-medium ml-1">
              상품명 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="예) Oversized Linen Blazer"
              className="w-full h-12 bg-black/50 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-brand-neon transition-colors"
            />
          </div>

          {/* 브랜드 */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-400 font-medium ml-1">
              브랜드 *
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              required
              placeholder="예) POTATA Studio"
              className="w-full h-12 bg-black/50 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-brand-neon transition-colors"
            />
          </div>

          {/* 정가 + 카테고리 (나란히) */}
          <div className="grid grid-cols-2 gap-4">
            {/* 정가 (필수) */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium ml-1">
                정가 (AED) *
              </label>
              <input
                type="number"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                required
                min={1}
                placeholder="예) 399"
                className="w-full h-12 bg-black/50 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-brand-neon transition-colors"
              />
            </div>

            {/* 카테고리 */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium ml-1">
                카테고리 *
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as Exclude<ProductCategory, "All"> | "")
                }
                required
                className="w-full h-12 bg-black/50 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-brand-neon transition-colors appearance-none cursor-pointer"
              >
                <option value="" disabled className="bg-zinc-900">
                  카테고리 선택
                </option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-zinc-900">
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 할인율 + 판매가 미리보기 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 할인율 (선택) */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium ml-1">
                할인율 (%)
              </label>
              <input
                type="number"
                value={discountRate}
                onChange={(e) => setDiscountRate(e.target.value)}
                min={0}
                max={100}
                placeholder="예) 25"
                className="w-full h-12 bg-black/50 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-brand-neon transition-colors"
              />
            </div>

            {/* 판매가 자동 계산 (읽기 전용 표시) */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium ml-1">
                판매가 (자동 계산)
              </label>
              <div className="w-full h-12 bg-black/30 border border-white/5 rounded-lg px-4 flex items-center gap-2">
                {salePrice != null ? (
                  <>
                    <span className="text-brand-neon font-bold">
                      {salePrice} AED
                    </span>
                    {rate > 0 && (
                      <>
                        <span className="text-zinc-500 text-sm line-through">
                          {listPrice}
                        </span>
                        <span className="text-xs text-red-400 font-semibold">
                          -{rate}%
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-zinc-600 text-sm">정가 입력 시 표시</span>
                )}
              </div>
            </div>
          </div>

          {/* 이미지 업로드 */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-400 font-medium ml-1">
              상품 이미지 * (jpg / png / webp, 단일)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={handleFileChange}
              className="w-full text-sm text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand-neon file:text-black file:font-bold file:text-xs hover:file:bg-brand-neon/80 transition-colors cursor-pointer"
            />
            {/* 이미지 미리보기 */}
            {imagePreview && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 relative w-32 h-32 rounded-lg overflow-hidden border border-white/10"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="이미지 미리보기"
                  className="w-full h-full object-cover"
                />
              </motion.div>
            )}
          </div>
        </div>

        {/* 선택 필드 카드 */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
          <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-4">
            추가 정보 (선택)
          </h2>

          {/* 사이즈 */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-400 font-medium ml-1">
              사이즈 (콤마 구분)
            </label>
            <input
              type="text"
              value={sizes}
              onChange={(e) => setSizes(e.target.value)}
              placeholder="S, M, L"
              className="w-full h-12 bg-black/50 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-brand-neon transition-colors"
            />
          </div>

          {/* 컬러 */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-400 font-medium ml-1">
              컬러 (콤마 구분)
            </label>
            <input
              type="text"
              value={colors}
              onChange={(e) => setColors(e.target.value)}
              placeholder="Black, White"
              className="w-full h-12 bg-black/50 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-brand-neon transition-colors"
            />
          </div>

          {/* 태그 칩 */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-medium ml-1">
              태그 (검색용)
            </label>
            {/* 추가된 태그 칩 목록 */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 bg-brand-neon/15 border border-brand-neon/40 text-brand-neon rounded-full pl-3 pr-1.5 py-1 text-sm"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(i)}
                      className="hover:bg-brand-neon/20 rounded-full p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* 태그 입력 */}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="엔터 또는 쉼표로 추가 (최대 10개)"
              className="w-full h-12 bg-black/50 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-brand-neon transition-colors"
            />
            <p className="text-xs text-zinc-600 ml-1">
              최대 10개, 각 태그 20자 이내 / Backspace로 마지막 태그 제거
            </p>
          </div>

          {/* 설명 */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-400 font-medium ml-1">
              상품 설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="상품의 특징과 소재를 간략히 설명해주세요."
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-neon transition-colors resize-none"
            />
          </div>

          {/* 배지 — 모두 자동 부여 */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-medium ml-1">
              배지
            </label>
            <p className="text-xs text-zinc-500 ml-1">
              NEW(등록 1주일 이내)·BEST(별점 4.8+, 리뷰 100+)·HOT(조회수 상위 4개 자동)는 모두 자동 부여됩니다.
            </p>
          </div>
        </div>

        {/* 에러 메시지 */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-red-400 text-sm bg-red-400/10 rounded-lg px-4 py-3"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* 제출 버튼 — 더블서밋 방지: disabled={submitting} */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full h-14 bg-brand-neon text-black font-bold text-base rounded-xl flex items-center justify-center gap-2 hover:bg-brand-neon/90 transition-all shadow-[0_0_20px_rgba(204,243,129,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              등록 중...
            </>
          ) : (
            "상품 등록하기"
          )}
        </button>
      </form>
    </div>
  );
}
