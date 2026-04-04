"use client";

import { useAuthStore } from "@/store/auth-store";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, RefreshCcw, Check } from "lucide-react";
import Image from "next/image";

export function Hero() {
    const { isLoggedIn } = useAuthStore();

    return (
        <section className="relative w-full h-[90vh] overflow-hidden bg-cinematic-900 text-white">
            {isLoggedIn ? <LoggedInHero /> : <GuestHero />}
        </section>
    );
}

function GuestHero() {
    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center text-center px-4">
            {/* Custom Banner Background */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/home-banner.jpg"
                    alt="Hero Banner"
                    fill
                    className="object-cover opacity-60"
                    priority
                />
                <div className="absolute inset-0 bg-black/40" />
            </div>

            <div className="relative z-10 max-w-4xl space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <h2 className="text-xl md:text-2xl font-light tracking-[0.2em] text-brand-neon mb-4">
                        SEOUL TO DUBAI
                    </h2>
                    <h1 className="text-5xl md:text-8xl font-bold tracking-tighter leading-none bg-clip-text text-transparent bg-linear-to-b from-white to-gray-500">
                        THE NEW <br /> K-VIBE
                    </h1>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto"
                >
                    Unique Korean Fashion curated for the Modern Generation.
                    <br /> Experience the future of style with AI.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <button className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-brand-neon hover:text-black transition-colors flex items-center gap-2">
                        Explore Collection
                    </button>
                    <button className="px-8 py-4 border border-white/20 hover:border-brand-neon hover:text-brand-neon rounded-full transition-colors backdrop-blur-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Try AI Studio
                    </button>
                </motion.div>
            </div>
        </div >
    );
}

function LoggedInHero() {
    const { user } = useAuthStore();

    return (
        <div className="relative w-full h-full flex flex-col md:flex-row">
            {/* Left Panel: AI Control / Greeting */}
            <div className="w-full md:w-1/3 h-1/2 md:h-full bg-cinematic-800 p-8 md:p-12 flex flex-col justify-center relative z-10 border-r border-white/5">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                >
                    <div className="flex items-center gap-2 text-brand-neon mb-2">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                        <span className="text-sm font-bold tracking-wider">AI COORDINATOR</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                        Hello, <span className="text-transparent bg-clip-text bg-linear-to-r from-brand-neon to-white">{user?.name || "User"}</span>.
                        <br />
                        <span className="text-2xl md:text-3xl text-gray-400 font-light">Here is your Pick.</span>
                    </h1>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        Based on your recent interest in <i>&quot;Minimalist Streetwear&quot;</i> and Dubai&apos;s current weather (24°C).
                    </p>

                    <div className="pt-8 flex flex-col gap-4">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                            <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Current Outfit</h4>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-white">Oversized Blazer Set</p>
                                    <p className="text-xs text-brand-neon">AED 349</p>
                                </div>
                                <ArrowRight className="text-gray-400 w-4 h-4" />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button className="flex-1 py-3 bg-brand-neon text-black font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-white transition-colors">
                                <Check className="w-4 h-4" />
                                Save Look
                            </button>
                            <button className="flex-1 py-3 bg-transparent border border-white/20 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                                <RefreshCcw className="w-4 h-4" />
                                Regenerate
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Right Panel: The Visual (Model) */}
            <div className="w-full md:w-2/3 h-1/2 md:h-full relative overflow-hidden bg-gray-900 group">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1549419395-814125f1969a?q=80&w=2600&auto=format&fit=crop')] bg-cover bg-center opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out"></div>
                <div className="absolute inset-0 bg-linear-to-t from-cinematic-900 via-transparent to-transparent opacity-80 md:opacity-40"></div>

                {/* Floating Tags */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="absolute bottom-8 right-8 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center gap-3"
                >
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-mono text-white">AI GENERATED FIT · 98% MATCH</span>
                </motion.div>
            </div>
        </div>
    );
}
