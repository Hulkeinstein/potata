"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";

const HIDE_KEY = "aiCoordinatorHiddenUntil";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 로그인 홈에 뜨는 AI COORDINATOR 팝업.
 * - 끄기: 이번만 닫기(새로고침/재방문 시 다시 표시)
 * - 하루동안 보지 않기: localStorage에 24시간 만료 시각 저장 → 그동안 미표시
 *
 * SSR 안전: 이 팝업은 로그인 상태(클라이언트)에서만 마운트된다(부모 Hero가
 * isLoggedIn으로 게이트). 따라서 useState 지연 초기화에서 localStorage를
 * 읽어도 안전하며, 서버 렌더에는 포함되지 않아 hydration mismatch가 없다.
 */
export function AICoordinatorPopup({ name }: { name?: string | null }) {
    const [visible, setVisible] = useState(() => {
        if (typeof window === "undefined") return false;
        let hiddenUntil = 0;
        try {
            hiddenUntil = Number(localStorage.getItem(HIDE_KEY)) || 0;
        } catch {
            hiddenUntil = 0;
        }
        return Date.now() > hiddenUntil;
    });

    // 이번만 닫기 (저장 안 함 → 다음 방문 시 다시 표시)
    const close = () => setVisible(false);

    // 24시간 동안 표시 안 함
    const hideForADay = () => {
        try {
            localStorage.setItem(HIDE_KEY, String(Date.now() + ONE_DAY_MS));
        } catch {
            // localStorage 불가 환경 — 최소 이번 세션은 닫힘
        }
        setVisible(false);
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={close}
                    className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-md bg-cinematic-800 border border-white/10 rounded-2xl p-6 shadow-2xl"
                    >
                        {/* 닫기 (X) */}
                        <button
                            onClick={close}
                            aria-label="닫기"
                            className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2 text-brand-neon mb-3">
                            <Sparkles className="w-5 h-5 animate-pulse" />
                            <span className="text-sm font-bold tracking-wider">AI COORDINATOR</span>
                        </div>

                        <h2 className="text-2xl font-bold leading-tight mb-2 text-white">
                            Hello,{" "}
                            <span className="text-transparent bg-clip-text bg-linear-to-r from-brand-neon to-white">
                                {name || "User"}
                            </span>
                            .
                        </h2>
                        <p className="text-gray-400 text-sm leading-relaxed mb-5">
                            개인화 코디 추천 기능을 준비하고 있습니다. 현재는 AI Studio에서 직접 스타일을 체험할 수 있습니다.
                        </p>

                        {/* 끄기 / 하루동안 보지 않기 */}
                        <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10 text-sm">
                            <button
                                onClick={close}
                                className="text-zinc-400 hover:text-white transition-colors font-medium"
                            >
                                끄기
                            </button>
                            <button
                                onClick={hideForADay}
                                className="text-zinc-400 hover:text-white transition-colors font-medium"
                            >
                                하루동안 보지 않기
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
