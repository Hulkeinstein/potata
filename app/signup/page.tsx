"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, X, User, Lock } from "lucide-react";
import { signIn } from "next-auth/react";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth";
import type { AuthApiResponse, SignupRequest } from "@/types";

const INITIAL_FORM: SignupRequest & { confirmPassword: string } = {
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
};

export default function SignupPage() {
    const router = useRouter();
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [form, setForm] = useState(INITIAL_FORM);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (form.password !== form.confirmPassword) {
            setError("비밀번호가 일치하지 않습니다.");
            return;
        }

        if (form.password.length < MIN_PASSWORD_LENGTH) {
            setError(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: form.email,
                    password: form.password,
                    name: form.name,
                } satisfies SignupRequest),
            });

            const data = (await res.json()) as AuthApiResponse;

            if (!res.ok || !data.success) {
                const errorMessage = data.success ? "회원가입에 실패했습니다." : data.error;
                setError(errorMessage ?? "회원가입에 실패했습니다.");
                return;
            }

            router.push(`/verify-email?email=${encodeURIComponent(form.email.trim())}`);
        } catch {
            setError("서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field: keyof typeof INITIAL_FORM, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">

            {/* Cinematic Background (Ken Burns Effect) */}
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
                        className="object-cover opacity-60"
                        priority
                    />
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
                </motion.div>
            </div>

            {/* Signup Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md p-8 mx-4"
            >
                {/* Logo Area */}
                <div className="text-center mb-10">
                    <h1 className="text-5xl font-black font-outfit tracking-tighter text-white mb-2 text-glow">
                        POTATA
                    </h1>
                    <p className="text-zinc-400 text-sm tracking-widest uppercase">
                        Seoul to Dubai • Premium Fashion
                    </p>
                </div>

                {/* Main Content: Social Buttons or Form */}
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">

                    <AnimatePresence mode="wait">
                        {!showEmailForm ? (
                            <motion.div
                                key="social-buttons"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-3"
                            >
                                <p className="text-center text-zinc-400 text-sm mb-6">
                                    Sign up with
                                </p>

                                {/* Google */}
                                <button
                                    onClick={() => signIn("google", { callbackUrl: "/" })}
                                    className="w-full h-12 bg-white text-black font-bold rounded-lg flex items-center justify-center gap-2 border border-zinc-200 transition-transform hover:scale-[1.02]"
                                >
                                    <span className="text-lg">G</span> Google로 계속하기
                                </button>

                                {/* Apple (준비중 — 아직 미지원) */}
                                <button
                                    disabled
                                    title="준비중입니다"
                                    className="w-full h-12 bg-zinc-800 text-white/50 font-bold rounded-lg flex items-center justify-center gap-2 border border-zinc-700 cursor-not-allowed"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                                    </svg>
                                    Apple로 계속하기 (준비중)
                                </button>

                                <div className="pt-4 border-t border-white/10 mt-6">
                                    <button
                                        onClick={() => setShowEmailForm(true)}
                                        className="w-full h-12 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 font-medium rounded-lg flex items-center justify-center gap-2 transition-colors border border-white/5"
                                    >
                                        <Mail className="w-4 h-4" /> 이메일로 회원가입
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="email-form"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-white">이메일 회원가입</h2>
                                    <button
                                        onClick={() => setShowEmailForm(false)}
                                        className="text-zinc-400 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleSignup} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-zinc-400 font-medium ml-1">이름</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                            <input
                                                type="text"
                                                value={form.name}
                                                onChange={(e) => updateField("name", e.target.value)}
                                                required
                                                className="w-full h-12 bg-black/50 border border-white/10 rounded-lg pl-11 pr-4 text-white focus:outline-none focus:border-brand-neon transition-colors"
                                                placeholder="홍길동"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs text-zinc-400 font-medium ml-1">이메일</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                            <input
                                                type="email"
                                                value={form.email}
                                                onChange={(e) => updateField("email", e.target.value)}
                                                required
                                                className="w-full h-12 bg-black/50 border border-white/10 rounded-lg pl-11 pr-4 text-white focus:outline-none focus:border-brand-neon transition-colors"
                                                placeholder="example@potata.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs text-zinc-400 font-medium ml-1">비밀번호</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                            <input
                                                type="password"
                                                value={form.password}
                                                onChange={(e) => updateField("password", e.target.value)}
                                                required
                                                className="w-full h-12 bg-black/50 border border-white/10 rounded-lg pl-11 pr-4 text-white focus:outline-none focus:border-brand-neon transition-colors"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs text-zinc-400 font-medium ml-1">비밀번호 확인</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                            <input
                                                type="password"
                                                value={form.confirmPassword}
                                                onChange={(e) => updateField("confirmPassword", e.target.value)}
                                                required
                                                className="w-full h-12 bg-black/50 border border-white/10 rounded-lg pl-11 pr-4 text-white focus:outline-none focus:border-brand-neon transition-colors"
                                                placeholder="••••••••"
                                            />
                                        </div>
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
                                        disabled={loading}
                                        className="w-full h-12 bg-brand-neon text-black font-bold rounded-lg flex items-center justify-center gap-2 mt-6 hover:bg-brand-neon/90 transition-all shadow-[0_0_15px_rgba(204,243,129,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                                className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full"
                                            />
                                        ) : (
                                            "다음 — 이메일 인증"
                                        )}
                                    </button>
                                </form>

                                <div className="text-center mt-4">
                                    <Link href="/login" className="text-xs text-zinc-400 hover:text-white underline decoration-zinc-700">
                                        이미 계정이 있으신가요? 로그인
                                    </Link>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Back to Home */}
                <div className="text-center mt-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-brand-neon transition-colors font-medium group"
                    >
                        로그인 없이 둘러보기 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

            </motion.div>
        </div>
    );
}
