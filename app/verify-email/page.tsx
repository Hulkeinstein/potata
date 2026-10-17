"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { authMessages, authErrorKey, type AuthMessageKey } from "@/lib/i18n/auth-messages";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { VerifyEmailForm } from "@/components/signup/VerifyEmailForm";
import { CheckCircle } from "lucide-react";
import { VERIFICATION_CODE_LENGTH } from "@/lib/auth";
import type { AuthApiResponse } from "@/types";

const EMPTY_CODES = Array.from({ length: VERIFICATION_CODE_LENGTH }, () => "");

export default function VerifyEmailPage() {
  const { locale } = useLanguage(); const t = authMessages[locale];
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [codes, setCodes] = useState<string[]>(EMPTY_CODES);
  const [error, setError] = useState<AuthMessageKey | "">("");
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
      setError("incompleteCode");
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
        setError(data.success ? "verifyFailed" : authErrorKey(data.error, "verifyFailed"));
        if (!data.success && data.tooManyAttempts) {
          setTimeout(() => router.replace("/signup"), 2000);
        }
        if (!data.success && data.expired) {
          setCodes([...EMPTY_CODES]);
        }
        return;
      }

      setSuccess(true);

      setTimeout(() => {
        router.replace(`/login?verified=1&email=${encodeURIComponent(email)}`);
      }, 1800);
    } catch {
      setError("connection");
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
        setError(data.success ? "resendFailed" : authErrorKey(data.error, "resendFailed"));
        return;
      }

      setCodes([...EMPTY_CODES]);
      inputRefs.current[0]?.focus();
      setResendCooldown(60);
    } catch {
      setError("connection");
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
                <h2 className="text-2xl font-bold text-white mb-2">{t.verified}</h2>
                <p className="text-zinc-400 text-sm">{t.redirecting}</p>
              </motion.div>
            ) : (
              <VerifyEmailForm
                codes={codes} error={error} loading={loading}
                resendLoading={resendLoading} resendCooldown={resendCooldown}
                maskedEmail={maskedEmail} inputRefs={inputRefs}
                handleCodeChange={handleCodeChange} handleKeyDown={handleKeyDown}
                handlePaste={handlePaste} handleVerify={() => { void handleVerify(); }}
                handleResend={() => { void handleResend(); }} onBack={() => router.back()}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
