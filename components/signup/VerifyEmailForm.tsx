"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowLeft, RefreshCw } from "lucide-react";
import type { RefObject } from "react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { authMessages, type AuthMessageKey } from "@/lib/i18n/auth-messages";
import { VERIFICATION_CODE_LENGTH } from "@/lib/auth";

type VerifyEmailFormProps = {
  readonly codes: readonly string[];
  readonly error: AuthMessageKey | "";
  readonly loading: boolean;
  readonly resendLoading: boolean;
  readonly resendCooldown: number;
  readonly maskedEmail: string;
  readonly inputRefs: RefObject<(HTMLInputElement | null)[]>;
  readonly handleCodeChange: (index: number, value: string) => void;
  readonly handleKeyDown: (index: number, event: React.KeyboardEvent<HTMLInputElement>) => void;
  readonly handlePaste: (event: React.ClipboardEvent) => void;
  readonly handleVerify: () => void;
  readonly handleResend: () => void;
  readonly onBack: () => void;
};

export function VerifyEmailForm({ codes, error, loading, resendLoading, resendCooldown, maskedEmail, inputRefs, handleCodeChange, handleKeyDown, handlePaste, handleVerify, handleResend, onBack }: VerifyEmailFormProps) {
  const { locale } = useLanguage(); const t = authMessages[locale];
  return (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <button
                    aria-label={t.back}
                    onClick={onBack}
                    className="text-zinc-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-white">{t.verifyTitle}</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {t.verifyHint}
                    </p>
                  </div>
                </div>

                {/* Email hint */}
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-6">
                  <Mail className="w-4 h-4 text-brand-neon flex-shrink-0" />
                  <div>
                    <p className="text-xs text-zinc-400">{t.sentTo}</p>
                    <p className="text-sm text-white font-medium">{maskedEmail}</p>
                  </div>
                </div>

                <p className="text-zinc-400 text-sm text-center mb-6">
                  {t.enterCode.replace("{count}", String(VERIFICATION_CODE_LENGTH))}
                </p>

                {/* Code inputs */}
                <div className="flex gap-3 justify-center mb-6">
                  {codes.map((digit, index) => (
                    <motion.input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      aria-label={t.codeDigit.replace("{count}", String(index + 1))}
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
                      {error && t[error].replace("{count}", String(VERIFICATION_CODE_LENGTH))}
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
                    t.verify
                  )}
                </button>

                {/* Resend */}
                <div className="text-center mt-5">
                  <p className="text-zinc-500 text-xs mb-2">{t.noCode}</p>
                  <button
                    onClick={handleResend}
                    disabled={resendLoading || resendCooldown > 0}
                    className="inline-flex items-center gap-1.5 text-sm text-zinc-300 hover:text-brand-neon transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? "animate-spin" : ""}`} />
                    {resendCooldown > 0
                      ? t.resendCountdown.replace("{count}", String(resendCooldown))
                      : t.resend}
                  </button>
                </div>
              </motion.div>
  );
}
