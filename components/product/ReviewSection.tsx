"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Star, Trash2, Pencil, X, Plus } from "lucide-react";
import Image from "next/image";
import { StarRating } from "@/components/product/StarRating";
import type { Review, ReviewListResponse } from "@/types";

const MAX_IMAGES = 3;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

interface ReviewSectionProps {
  productId: string;
}

export function ReviewSection({ productId }: ReviewSectionProps) {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated" && !!session?.user?.id;

  // 목록 상태
  const [data, setData] = useState<ReviewListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // 폼 상태
  const [editing, setEditing] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  // 유지할 기존 이미지 URL (수정 시 선택적 제거)
  const [keepUrls, setKeepUrls] = useState<string[]>([]);
  // 새로 추가할 파일
  const [files, setFiles] = useState<File[]>([]);
  // 새 파일 objectURL 미리보기
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // 숨김 파일 input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // files 변경 시 objectURL 생성/해제
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  // "+" 타일 클릭 → 파일 선택 핸들러
  const onAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    const picked = Array.from(e.target.files ?? []);
    // 총 개수 검증
    if (keepUrls.length + files.length + picked.length > MAX_IMAGES) {
      setFormError(`사진은 최대 ${MAX_IMAGES}장`);
      e.target.value = "";
      return;
    }
    for (const f of picked) {
      if (!ALLOWED.includes(f.type)) {
        setFormError("jpg/png/webp만 올릴 수 있습니다.");
        e.target.value = "";
        return;
      }
      if (f.size > MAX_SIZE) {
        setFormError("각 사진은 5MB 이하여야 합니다.");
        e.target.value = "";
        return;
      }
    }
    setFiles((prev) => [...prev, ...picked]);
    // 같은 파일 재선택 허용
    e.target.value = "";
  };

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`);
      const json = await res.json();
      if (json.success && json.data) {
        const listData = json.data as ReviewListResponse;
        setData(listData);
        // 자동 prefill 제거 — 수정 클릭 시 명시적 세팅으로 대체
      }
    } catch {
      // 로드 실패는 조용히 처리 — 빈 상태로 렌더
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // 본인 리뷰 여부
  const myReview: Review | undefined =
    isLoggedIn && session?.user?.id && data
      ? data.reviews.find((r) => r.userId === session.user.id)
      : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setNotice(null);

    if (myRating === 0) {
      setFormError("별점을 선택해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("rating", String(myRating));
      if (myComment) fd.append("comment", myComment);
      // 유지할 기존 URL
      keepUrls.forEach((u) => fd.append("keepImageUrls", u));
      // 새 파일
      files.forEach((f) => fd.append("images", f));

      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();

      if (res.status === 401) {
        setFormError("리뷰를 작성하려면 로그인이 필요합니다.");
        return;
      }
      if (res.status === 403) {
        setFormError("해당 상품을 구매한 사용자만 리뷰를 작성할 수 있습니다.");
        return;
      }
      if (res.status === 409) {
        setFormError("이미 리뷰가 처리되었습니다. 새로고침 후 다시 시도해 주세요.");
        return;
      }
      if (!json.success) {
        setFormError(json.error ?? "리뷰 제출에 실패했습니다.");
        return;
      }

      setFiles([]);
      setKeepUrls([]);
      setNotice(myReview ? "리뷰가 수정되었습니다." : "리뷰가 등록되었습니다.");
      setEditing(false);
      await loadReviews();
    } catch {
      setFormError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("리뷰를 삭제하시겠습니까?")) return;
    setFormError(null);
    setNotice(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!json.success) {
        setFormError(json.error ?? "삭제에 실패했습니다.");
        return;
      }

      setMyRating(0);
      setMyComment("");
      setEditing(false);
      setNotice("리뷰가 삭제되었습니다.");
      await loadReviews();
    } catch {
      setFormError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setDeleting(false);
    }
  };

  // 총 이미지 수 (기존 유지 + 새 파일)
  const totalImages = keepUrls.length + files.length;

  return (
    <div className="pt-4 space-y-6">
      {/* 헤더 — 평균 별점 + 리뷰 수 */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Reviews</h3>
        {data && data.reviewCount > 0 && (
          <div className="flex items-center gap-2">
            <StarRating
              value={data.averageRating ?? 0}
              readonly
              size="sm"
            />
            <span className="text-brand-neon font-semibold text-sm">
              {data.averageRating !== null
                ? data.averageRating.toFixed(1)
                : "—"}
            </span>
            <span className="text-zinc-400 text-sm">
              ({data.reviewCount}개 리뷰)
            </span>
          </div>
        )}
      </div>

      {/* 로그인 상태 — 트리거 버튼 또는 작성/수정 폼 */}
      {isLoggedIn ? (
        <>
          {/* 트리거: 폼이 닫혀 있을 때만 노출 */}
          {!editing && (
            <div>
              {!myReview ? (
                <button
                  type="button"
                  onClick={() => {
                    setMyRating(0);
                    setMyComment("");
                    setKeepUrls([]);
                    setFiles([]);
                    setFormError(null);
                    setEditing(true);
                  }}
                  className="px-5 py-2 rounded-full bg-brand-neon text-black text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  리뷰 작성하기
                </button>
              ) : (
                <p className="text-xs text-zinc-500">내 리뷰가 등록되어 있습니다. 목록에서 수정·삭제할 수 있습니다.</p>
              )}
            </div>
          )}

          {/* 성공 알림 — 폼 닫힌 후에도 표시 */}
          {notice && !editing && (
            <p className="text-sm text-brand-neon">{notice}</p>
          )}

          {/* 작성/수정 폼 — editing 상태일 때만 렌더 */}
          {editing && (
            <form
              onSubmit={handleSubmit}
              className="bg-zinc-900/30 border border-white/10 rounded-xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-300">
                  {myReview ? "내 리뷰 수정" : "리뷰 작성"}
                </p>
              </div>

              {/* 별점 선택 */}
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">별점 *</label>
                <StarRating
                  value={myRating}
                  onChange={setMyRating}
                />
              </div>

              {/* 코멘트 */}
              <div className="space-y-1">
                <label className="text-xs text-zinc-400" htmlFor="review-comment">
                  코멘트 (선택, 최대 2000자)
                </label>
                <textarea
                  id="review-comment"
                  value={myComment}
                  onChange={(e) => setMyComment(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="상품에 대한 솔직한 리뷰를 남겨 주세요."
                  className="w-full bg-zinc-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:border-brand-neon/50 transition-colors"
                />
                <p className="text-right text-xs text-zinc-600">
                  {myComment.length}/2000
                </p>
              </div>

              {/* 사진 갤러리 편집기 */}
              <div className="space-y-2">
                <p className="text-xs text-zinc-400">사진 (선택, 최대 3장)</p>
                <div className="flex flex-wrap gap-2">
                  {/* 기존 이미지 썸네일 (hover X → 제거) */}
                  {keepUrls.map((url) => (
                    <div key={url} className="relative group">
                      <Image
                        src={url}
                        width={80}
                        height={80}
                        alt="리뷰 이미지"
                        className="rounded-lg object-cover w-20 h-20"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setKeepUrls((prev) => prev.filter((u) => u !== url))
                        }
                        className="absolute -top-1.5 -right-1.5 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="사진 삭제"
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  ))}

                  {/* 새 파일 objectURL 미리보기 (hover X → 제거) */}
                  {files.map((_, idx) => (
                    <div key={idx} className="relative group">
                      {/* objectURL은 next/image에서 최적화 불가 → plain img 사용 */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previews[idx]}
                        alt="새 리뷰 이미지 미리보기"
                        className="rounded-lg object-cover w-20 h-20"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFiles((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="absolute -top-1.5 -right-1.5 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="사진 삭제"
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  ))}

                  {/* "+" 추가 타일 — 총 3장 미만일 때 표시 */}
                  {totalImages < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center text-zinc-500 hover:border-brand-neon hover:text-brand-neon transition-colors"
                      aria-label="사진 추가"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  )}
                </div>

                {/* 숨김 파일 input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  aria-label="사진 파일 선택"
                  onChange={onAddFiles}
                />
              </div>

              {/* 오류/알림 메시지 */}
              {formError && (
                <p className="text-sm text-red-400">{formError}</p>
              )}
              {notice && (
                <p className="text-sm text-brand-neon">{notice}</p>
              )}

              {/* 버튼 영역 */}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-full bg-brand-neon text-black text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting
                    ? "제출 중..."
                    : myReview
                    ? "리뷰 수정"
                    : "리뷰 등록"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // 수정 모드면 원래 값으로 원복, 작성 모드면 초기화
                    if (myReview) {
                      setMyRating(myReview.rating);
                      setMyComment(myReview.comment ?? "");
                      setKeepUrls(myReview.imageUrls ?? []);
                    } else {
                      setMyRating(0);
                      setMyComment("");
                      setKeepUrls([]);
                    }
                    setFiles([]);
                    setFormError(null);
                    setEditing(false);
                  }}
                  className="px-5 py-2 rounded-full border border-white/15 text-zinc-400 text-sm hover:text-zinc-200 hover:border-white/30 transition-colors"
                >
                  취소
                </button>
              </div>
            </form>
          )}
        </>
      ) : (
        status !== "loading" && (
          <div className="bg-zinc-900/20 border border-white/5 rounded-xl px-5 py-4 text-sm text-zinc-400">
            리뷰를 작성하려면{" "}
            <a href="/login" className="text-brand-neon hover:underline">
              로그인
            </a>
            이 필요합니다.
          </div>
        )
      )}

      {/* 리뷰 목록 */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-zinc-900/30 animate-pulse"
            />
          ))}
        </div>
      ) : data && data.reviews.length > 0 ? (
        <ul className="space-y-4">
          {data.reviews.map((review) => (
            <li
              key={review.id}
              className="bg-zinc-900/20 border border-white/5 rounded-xl p-4 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200">
                    {review.userName || "익명"}
                  </span>
                  {isLoggedIn &&
                    session?.user?.id === review.userId && (
                      <span className="text-xs text-brand-neon border border-brand-neon/30 rounded-full px-2 py-0.5 leading-none">
                        내 리뷰
                      </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                  {/* 본인 리뷰 — 수정/삭제 버튼 */}
                  {isLoggedIn && session?.user?.id === review.userId && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setMyRating(review.rating);
                          setMyComment(review.comment ?? "");
                          setKeepUrls(review.imageUrls ?? []);
                          setFiles([]);
                          setFormError(null);
                          setEditing(true);
                        }}
                        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                        aria-label="리뷰 수정"
                      >
                        <Pencil className="w-3 h-3" />
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                        aria-label="리뷰 삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                        {deleting ? "삭제 중..." : "삭제"}
                      </button>
                    </>
                  )}
                  <span className="text-xs text-zinc-600">
                    {new Date(review.createdAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
              </div>
              <StarRating value={review.rating} readonly size="sm" />
              {review.comment && (
                <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                  {review.comment}
                </p>
              )}
              {review.imageUrls?.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {review.imageUrls.map((url) => (
                    <Image
                      key={url}
                      src={url}
                      width={80}
                      height={80}
                      alt="리뷰 이미지"
                      className="rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        /* 빈 상태 — ProductDetailClient 톤 일치 */
        <div className="py-20 flex flex-col items-center justify-center text-center gap-3 bg-zinc-900/20 rounded-xl border border-white/5">
          <Star className="w-10 h-10 text-zinc-700" />
          <p className="text-zinc-400 font-medium">
            No reviews yet. Be the first to review!
          </p>
        </div>
      )}
    </div>
  );
}
