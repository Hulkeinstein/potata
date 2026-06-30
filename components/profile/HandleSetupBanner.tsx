"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Hash, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * HandleSetupBanner
 *
 * handle이 null인 로그인 유저에게 핸들 설정을 비강제로 유도하는 배너.
 * - GET /api/users/me/handle 로 handle null 판정 (JWT에 handle 없으므로 DB 직접 조회)
 * - 강제 redirect 없음 — 배너만 표시
 * - 닫기(X) 버튼으로 세션 내 숨기기 가능 (localStorage 미사용 — 단순화)
 */
export function HandleSetupBanner({ returnTo }: { returnTo?: string }) {
  const { status } = useSession();
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 로그인 상태일 때만 handle 조회
    if (status !== "authenticated") return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/users/me/handle");
        if (!res.ok) return;
        const data = (await res.json()) as { success: boolean; data?: { handle: string | null } };
        if (!cancelled && data.success && data.data?.handle === null) {
          setShowBanner(true);
        }
      } catch {
        // 조용히 실패 — 배너는 부가 기능, 에러 노출 불필요
      }
    })();

    return () => { cancelled = true; };
  }, [status]);

  const handleUrl = returnTo
    ? `/onboarding/handle?returnTo=${encodeURIComponent(returnTo)}`
    : "/onboarding/handle";

  return (
    <AnimatePresence>
      {showBanner && !dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="w-full bg-brand-neon/10 border border-brand-neon/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 p-1.5 bg-brand-neon/20 rounded-lg">
              <Hash className="w-4 h-4 text-brand-neon" />
            </div>
            <p className="text-sm text-zinc-200 truncate">
              <span className="font-semibold text-white">핸들을 설정하면</span>{" "}
              프로필이 공개되고 팔로워가 나를 찾을 수 있어요.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={handleUrl}
              className="text-xs font-bold text-brand-neon hover:text-brand-neon/80 transition-colors whitespace-nowrap px-3 py-1.5 border border-brand-neon/40 rounded-lg hover:bg-brand-neon/10"
            >
              설정하기
            </Link>
            <button
              onClick={() => setDismissed(true)}
              aria-label="배너 닫기"
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
