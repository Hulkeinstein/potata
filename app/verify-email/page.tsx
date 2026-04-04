"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowLeft, RefreshCw, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { VERIFICATION_CODE_LENGTH } from "@/lib/auth";
import type { AuthApiResponse, User } from "@/types";

const EMPTY_CODES = Array.from({ length: VERIFICATION_CODE_LENGTH }, () => "");

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const login = useAuthStore((state) => state.login);

  const [codes, setCodes] = useState<string[]>(EMPTY_CODES);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [success, setSuccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 재발송 쿨다운 타이머
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!email) router.replace("/signup");
  }, [email, router]);

  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newCodes = [...codes];
    newCodes[index] = digit;
    setCodes(newCodes);
    setError("");

    if (digit && index < VERIFICATION_CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === VERIFICATION_CODE_LENGTH - 1) {
      const fullCode = newCodes.join("");
      if (fullCode.length === VERIFICATION_CODE_LENGTH) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !codes[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < VERIFICATION_CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, VERIFICATION_CODE_LENGTH);
    if (!pasted) return;
    const newCodes = [...EMPTY_CODES];
    for (let i = 0; i < VERIFICATION_CODE_LENGTH; i += 1) {
      newCodes[i] = pasted[i] || "";
    }
    setCodes(newCodes);
    inputRefs.current[Math.min(pasted.length, VERIFICATION_CODE_LENGTH - 1)]?.focus();

    if (pasted.length === VERIFICATION_CODE_LENGTH) {
      handleVerify(pasted);
    }
  };

  const handleVerify = async (codeOverride?: string) => {
    const code = codeOverride ?? codes.join("");
    if (code.length < VERIFICATION_CODE_LENGTH) {
      setError(`${VERIFICATION_CODE_LENGTH}자리 인증 코드를 모두 입력해주세요.`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = (await res.json()) as AuthApiResponse;

      if (!res.ok || !data.success) {
        const errorMessage = data.success ? "인증에 실패했습니다." : data.error;
        setError(errorMessage ?? "인증에 실패했습니다.");
        if (!data.success && data.tooManyAttempts) {
          setTimeout(() => router.replace("/signup"), 2000);
        }
        if (!data.success && data.expired) {
          setCodes([...EMPTY_CODES]);
        }
        return;
      }

      const verifiedUser = data.user as User | undefined;
      if (!verifiedUser) {
        setError("인증 결과를 처리할 수 없습니다. 다시 시도해주세요.");
        return;
      }

      setSuccess(true);
      login(verifiedUser);

      setTimeout(() => {
        router.replace("/");
      }, 1800);
    } catch {
      setError("서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await res.json()) as AuthApiResponse;

      if (!res.ok || !data.success) {
        const errorMessage = data.success ? "재발송에 실패했습니다." : data.error;
        setError(errorMessage ?? "재발송에 실패했습니다.");
        return;
      }

      setCodes([...EMPTY_CODES]);
      inputRefs.current[0]?.focus();
      setResendCooldown(60);
    } catch {
      setError("서버와 연결할 수 없습니다.");
    } finally {
      setResendLoading(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/(.{2}).+(@.+)/, "$1***$2")
    : "";

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0">
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: 1.1 }}
          transition={{ duration: 20, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
          className="relative w-full h-full"
        >
          <Image
            src="https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=2073&auto=format&fit=crop"
            alt="Cinematic Background"
            fill
            className="object-cover opacity-40"
            priority
          />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        </motion.div>
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md p-8 mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black font-outfit tracking-tighter text-white mb-2 text-glow">
            POTATA
          </h1>
          <p className="text-zinc-400 text-sm tracking-widest uppercase">
            Seoul to Dubai • Premium Fashion
          </p>
        </div>

        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  className="flex justify-center mb-4"
                >
                  <CheckCircle className="w-16 h-16 text-brand-neon" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">인증 완료!</h2>
                <p className="text-zinc-400 text-sm">잠시 후 홈으로 이동합니다...</p>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => router.back()}
                    className="text-zinc-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-white">이메일 인증</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      인증 코드를 확인해주세요
                    </p>
                  </div>
                </div>

                {/* Email hint */}
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-6">
                  <Mail className="w-4 h-4 text-brand-neon flex-shrink-0" />
                  <div>
                    <p className="text-xs text-zinc-400">발송 주소</p>
                    <p className="text-sm text-white font-medium">{maskedEmail}</p>
                  </div>
                </div>

                <p className="text-zinc-400 text-sm text-center mb-6">
                  {VERIFICATION_CODE_LENGTH}자리 인증 코드를 입력해주세요
                </p>

                {/* Code inputs */}
                <div className="flex gap-3 justify-center mb-6">
                  {codes.map((digit, index) => (
                    <motion.input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      whileFocus={{ scale: 1.05 }}
                      className={`
                        w-12 h-14 text-center text-xl font-bold rounded-xl border
                        bg-black/50 text-white
                        focus:outline-none transition-all
                        ${digit
                          ? "border-brand-neon shadow-[0_0_10px_rgba(204,243,129,0.3)]"
                          : "border-white/10 focus:border-brand-neon/60"
                        }
                      `}
                    />
                  ))}
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      key="error"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-red-400 text-sm text-center mb-4"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Verify button */}
                <button
                  onClick={() => handleVerify()}
                  disabled={loading || codes.join("").length < 6}
                  className="w-full h-12 bg-brand-neon text-black font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-brand-neon/90 transition-all shadow-[0_0_15px_rgba(204,243,129,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full"
                    />
                  ) : (
                    "인증하기"
                  )}
                </button>

                {/* Resend */}
                <div className="text-center mt-5">
                  <p className="text-zinc-500 text-xs mb-2">코드를 받지 못하셨나요?</p>
                  <button
                    onClick={handleResend}
                    disabled={resendLoading || resendCooldown > 0}
                    className="inline-flex items-center gap-1.5 text-sm text-zinc-300 hover:text-brand-neon transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? "animate-spin" : ""}`} />
                    {resendCooldown > 0
                      ? `재발송 (${resendCooldown}초)`
                      : "인증 코드 재발송"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
