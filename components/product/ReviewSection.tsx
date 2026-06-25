"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Star, Trash2 } from "lucide-react";
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
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    const picked = Array.from(e.target.files ?? []);
    if (picked.length > MAX_IMAGES) {
      setFormError(`사진은 최대 ${MAX_IMAGES}장`);
      return;
    }
    for (const f of picked) {
      if (!ALLOWED.includes(f.type)) {
        setFormError("jpg/png/webp만 올릴 수 있습니다.");
        return;
      }
      if (f.size > MAX_SIZE) {
        setFormError("각 사진은 5MB 이하여야 합니다.");
        return;
      }
    }
    setFiles(picked);
  };

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`);
      const json = await res.json();
      if (json.success && json.data) {
        const listData = json.data as ReviewListResponse;
        setData(listData);
        // 본인 리뷰가 있으면 폼에 prefill
        if (isLoggedIn && session?.user?.id) {
          const mine = listData.reviews.find(
            (r) => r.userId === session.user.id,
          );
          if (mine) {
            setMyRating(mine.rating);
            setMyComment(mine.comment ?? "");
          }
        }
      }
    } catch {
      // 로드 실패는 조용히 처리 — 빈 상태로 렌더
    } finally {
      setLoading(false);
    }
  }, [productId, isLoggedIn, session?.user?.id]);

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
      setNotice(myReview ? "리뷰가 수정되었습니다." : "리뷰가 등록되었습니다.");
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
      setNotice("리뷰가 삭제되었습니다.");
      await loadReviews();
    } catch {
      setFormError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setDeleting(false);
    }
  };

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

      {/* 작성/수정 폼 — 로그인 시 노출, 비로그인 시 안내 */}
      {isLoggedIn ? (
        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900/30 border border-white/10 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-300">
              {myReview ? "내 리뷰 수정" : "리뷰 작성"}
            </p>
            {myReview && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                aria-label="리뷰 삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            )}
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

          {/* 사진 첨부 (선택) */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-400" htmlFor="review-images">
              사진 (선택, 최대 3장)
            </label>
            <input
              id="review-images"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={onFileChange}
              className="mt-1 block w-full text-sm text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-white file:text-black file:font-bold file:text-xs hover:file:bg-gray-200"
            />
            {files.length > 0 && (
              <p className="text-xs text-brand-neon">{files.length}장 선택됨</p>
            )}
          </div>

          {/* 오류/알림 메시지 */}
          {formError && (
            <p className="text-sm text-red-400">{formError}</p>
          )}
          {notice && (
            <p className="text-sm text-brand-neon">{notice}</p>
          )}

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
        </form>
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
                <span className="text-xs text-zinc-600">
                  {new Date(review.createdAt).toLocaleDateString("ko-KR")}
                </span>
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
