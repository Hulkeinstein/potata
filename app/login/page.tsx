"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, X } from "lucide-react";
import { signIn, useSession } from "next-auth/react";

export default function LoginPage() {
    const router = useRouter();
    const { status } = useSession();
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (status === "authenticated") {
            router.replace("/");
        }
    }, [router, status]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        setIsLoading(false);

        if (result?.error) {
            setError("이메일 또는 비밀번호가 올바르지 않습니다.");
            return;
        }

        router.push("/");
        router.refresh();
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

            {/* Login Card */}
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
                                    Sign in with
                                </p>

                                {/* Google */}
                                <button className="w-full h-12 bg-white text-black font-bold rounded-lg flex items-center justify-center gap-2 border border-zinc-200 transition-transform hover:scale-[1.02]">
                                    <span className="text-lg">G</span> Google로 계속하기
                                </button>

                                <div className="pt-4 border-t border-white/10 mt-6">
                                    <button
                                        onClick={() => setShowEmailForm(true)}
                                        className="w-full h-12 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 font-medium rounded-lg flex items-center justify-center gap-2 transition-colors border border-white/5"
                                    >
                                        <Mail className="w-4 h-4" /> 이메일로 로그인
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
                                    <h2 className="text-xl font-bold text-white">이메일 로그인</h2>
                                    <button
                                        onClick={() => setShowEmailForm(false)}
                                        className="text-zinc-400 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-4">
                                    {error && (
                                        <p className="text-red-400 text-xs text-center bg-red-400/10 rounded-lg px-3 py-2">
                                            {error}
                                        </p>
                                    )}
                                    <div className="space-y-1">
                                        <label className="text-xs text-zinc-400 font-medium ml-1">이메일</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full h-12 bg-black/50 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-brand-neon transition-colors"
                                            placeholder="example@potata.com"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-zinc-400 font-medium ml-1">비밀번호</label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full h-12 bg-black/50 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-brand-neon transition-colors"
                                            placeholder="••••••••"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-12 bg-brand-neon text-black font-bold rounded-lg flex items-center justify-center gap-2 mt-6 hover:bg-brand-neon/90 transition-all shadow-[0_0_15px_rgba(204,243,129,0.4)] disabled:opacity-50"
                                    >
                                        {isLoading ? "로그인 중..." : "로그인"}
                                    </button>
                                </form>

                                <div className="text-center mt-4">
                                    <Link href="/signup" className="text-xs text-zinc-400 hover:text-white underline decoration-zinc-700">
                                        계정이 없으신가요? 회원가입
                                    </Link>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Guest Link */}
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
