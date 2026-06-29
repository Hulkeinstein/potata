"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, TrendingUp, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

const POPULAR_SEARCHES = [
    "Wide Denim", "Crop Hoodie", "Matin Kim", "Oversized Blazer", "Cargo Pants"
];

const RECENT_BRANDS = [
    "ANDERSSON BELL", "Thug Club", "Matin Kim", "Acne Studios", "Gentle Monster"
];

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const term = searchTerm.trim();
        if (term.length < 2) return; // 최소 2자 가드 — 이동 안 함
        router.push(`/search?q=${encodeURIComponent(term)}`);
        onClose();
    };

    // Auto-focus input when opened
    useEffect(() => {
        if (isOpen) {
            // Prevent scrolling on body when overlay is open
            document.body.style.overflow = "hidden";
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [isOpen]);

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xl flex flex-col items-center pt-20 px-4"
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        aria-label="Close search"
                        className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    {/* Search Input */}
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="w-full max-w-3xl relative mb-12"
                    >
                        <form onSubmit={handleSubmit}>
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search brands, items..."
                                aria-label="Search products"
                                autoFocus
                                className="w-full bg-transparent border-b-2 border-white/20 text-3xl md:text-5xl font-bold text-white placeholder-gray-500 py-4 focus:outline-none focus:border-brand-neon transition-colors"
                            />
                        </form>
                        <Search className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 text-gray-400" />
                    </motion.div>

                    {/* Content Section */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-12"
                    >
                        {/* Popular Searches */}
                        <div>
                            <div className="flex items-center gap-2 text-brand-neon mb-6">
                                <TrendingUp className="w-5 h-5" />
                                <h3 className="text-sm font-bold uppercase tracking-wider">Popular Now</h3>
                            </div>
                            <ul className="space-y-4">
                                {POPULAR_SEARCHES.map((term, index) => (
                                    <li key={term} className="group cursor-pointer flex items-center gap-4">
                                        <span className={cn(
                                            "text-lg font-bold w-6 text-center",
                                            index < 3 ? "text-white" : "text-gray-400"
                                        )}>
                                            {index + 1}
                                        </span>
                                        <span className="text-xl text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all">
                                            {term}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Recent Brands */}
                        <div>
                            <div className="flex items-center gap-2 text-purple-400 mb-6">
                                <Store className="w-5 h-5" />
                                <h3 className="text-sm font-bold uppercase tracking-wider">Trending Brands</h3>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {RECENT_BRANDS.map((brand) => (
                                    <Link
                                        key={brand}
                                        href={`/search?q=${encodeURIComponent(brand)}`}
                                        className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-brand-neon hover:text-white transition-all text-sm"
                                        onClick={onClose}
                                    >
                                        {brand}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
