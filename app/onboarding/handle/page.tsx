"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { Hash, ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function OnboardingHandlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  const [handle, setHandle] = useState("");
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [handleChecking, setHandleChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // 미인증 유저는 로그인 유도 (강제 리다이렉트 아님 — 비강제 배너 진입 보완)
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">로그인 후 이용할 수 있습니다.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-neon text-black font-bold rounded-lg hover:bg-brand-neon/90 transition-all"
          >
            로그인 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return <div className="min-h-screen bg-black" />;
  }

  // handle onBlur 중복체크 — /api/auth/handle/check 재사용
  const checkHandleAvailable = async () => {
    const raw = handle.trim();
    if (!raw) return;
    setHandleChecking(true);
    try {
      const res = await fetch(`/api/auth/handle/check?handle=${encodeURIComponent(raw)}`);
      const data = (await res.json()) as { available: boolean };
      setHandleAvailable(data.available);
    } catch {
      setHandleAvailable(null);
    } finally {
      setHandleChecking(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!handle.trim()) {
      setError("핸들을 입력해주세요.");
      return;
    }

    // 중복체크 미실시 또는 사용 불가 방어
    if (handleAvailable === false) {
      setError("이미 사용 중이거나 사용할 수 없는 핸들입니다.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/users/me/handle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: handle.trim() }),
      });

      const data = (await res.json()) as { success: boolean; error?: string };

      if (!res.ok || !data.success) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      setSuccess(true);

      // 저장 성공 후 복귀 — returnTo 파라미터 우선, 없으면 /what-to-wear
      const returnTo = searchParams.get("returnTo") ?? "/what-to-wear";
      setTimeout(() => {
        router.push(returnTo);
      }, 800);
    } catch {
      setError("서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* 배경 그라디언트 */}
      <div className="absolute inset-0 bg-linear-to-br from-zinc-900 via-black to-zinc-950 z-0" />
      <div className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(ellipse at 30% 40%, rgba(204,243,129,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(168,85,247,0.1) 0%, transparent 60%)"
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md p-8 mx-4"
      >
        {/* 로고 영역 */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black font-outfit tracking-tighter text-white mb-2 text-glow">
            POTATA
          </h1>
          <p className="text-zinc-400 text-sm tracking-widest uppercase">
            프로필 핸들 설정
          </p>
        </div>

        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-1">@핸들 설정</h2>
            <p className="text-zinc-400 text-sm">
              핸들은 프로필 URL과 팔로워가 나를 찾는 데 사용됩니다.
              영소문자·숫자·밑줄(_), 3~20자.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium ml-1">핸들 @</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => {
                    setHandle(e.target.value);
                    setHandleAvailable(null);
                    setError("");
                  }}
                  onBlur={checkHandleAvailable}
                  disabled={saving || success}
                  className={`w-full h-12 bg-black/50 border rounded-lg pl-11 pr-4 text-white focus:outline-none transition-colors disabled:opacity-60 ${
                    handleAvailable === true
                      ? "border-green-500 focus:border-green-400"
                      : handleAvailable === false
                        ? "border-red-500 focus:border-red-400"
                        : "border-white/10 focus:border-brand-neon"
                  }`}
                  placeholder="my_handle"
                  autoFocus
                />
              </div>

              {/* 중복체크 피드백 */}
              {handleChecking && (
                <p className="text-xs text-zinc-400 ml-1">확인 중...</p>
              )}
              {!handleChecking && handleAvailable === true && (
                <p className="text-xs text-green-400 ml-1">사용 가능한 핸들입니다.</p>
              )}
              {!handleChecking && handleAvailable === false && (
                <p className="text-xs text-red-400 ml-1">이미 사용 중이거나 사용할 수 없는 핸들입니다.</p>
              )}
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-red-400 text-sm text-center"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={saving || success || !handle.trim()}
              className="w-full h-12 bg-brand-neon text-black font-bold rounded-lg flex items-center justify-center gap-2 mt-2 hover:bg-brand-neon/90 transition-all shadow-[0_0_15px_rgba(204,243,129,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {success ? (
                <motion.span
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" /> 저장 완료!
                </motion.span>
              ) : saving ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full"
                />
              ) : (
                <>
                  핸들 저장 <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 나중에 설정 — 비강제 */}
          <div className="text-center mt-4">
            <Link
              href={searchParams.get("returnTo") ?? "/what-to-wear"}
              className="text-xs text-zinc-500 hover:text-zinc-300 underline decoration-zinc-700 transition-colors"
            >
              나중에 설정하기
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
