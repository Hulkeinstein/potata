"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { AICoordinatorPopup } from "./AICoordinatorPopup";

export function Hero() {
    const { data: session, status } = useSession();
    const isLoggedIn = status === "authenticated";

    return (
        <section className="relative w-full h-[90vh] overflow-hidden bg-cinematic-900 text-white">
            <GuestHero />
            {/* 로그인 시 AI COORDINATOR는 패널 대신 팝업으로 (끄기/하루동안 보지 않기) */}
            {isLoggedIn && <AICoordinatorPopup name={session?.user.name} />}
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
