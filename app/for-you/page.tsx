"use client";

import Image from "next/image";
import { PRODUCTS } from "@/data/dummy";
import { Sparkles, RefreshCcw } from "lucide-react";

import { ProductCard } from "@/components/ui/ProductCard";

export default function ForYouPage() {
    return (
        <div className="min-h-screen bg-black pt-20 pb-20 text-white">
            {/* ... header and AI Curator Card ... */}
            <div className="max-w-7xl mx-auto min-h-screen">

                <div className="px-5 mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-2xl font-bold tracking-tight">For Sarah</h1>
                        <button className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                            <RefreshCcw className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-sm text-gray-500">Analysis based on your recent style.</p>
                </div>

                {/* AI Curator Card */}
                <section className="px-5 mb-10">
                    <div className="relative rounded-2xl overflow-hidden bg-zinc-900 aspect-2/1 shadow-2xl border border-white/10 group">
                        <div className="absolute inset-0 opacity-60 group-hover:scale-105 transition-transform duration-700">
                            <Image
                                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80"
                                alt="Analysis"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div className="absolute inset-0 bg-linear-to-r from-black via-black/50 to-transparent flex flex-col justify-center p-8">
                            <div className="inline-flex items-center gap-1.5 bg-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-full w-fit mb-4 animate-pulse">
                                <Sparkles className="w-3 h-3" />
                                <span>AI ANALYSIS</span>
                            </div>
                            <h2 className="text-white text-2xl md:text-3xl font-black leading-tight mb-3">
                                "You love <br /> <span className="text-purple-400">Minimal & Chic</span> vibes."
                            </h2>
                            <p className="text-gray-300 text-xs tracking-wider">Based on 12 viewed items</p>
                        </div>
                    </div>
                </section>

                {/* Keyword Tags */}
                <div className="flex gap-2 px-5 overflow-x-auto no-scrollbar mb-10">
                    {["#Minimalist", "#Office Look", "#Neutral Tone", "#Tweed"].map(tag => (
                        <span key={tag} className="text-xs font-bold px-4 py-2 bg-white/5 border border-white/10 rounded-full text-gray-300 whitespace-nowrap hover:border-purple-500/50 hover:text-white transition-colors cursor-pointer">
                            {tag}
                        </span>
                    ))}
                </div>

                {/* Recommended Products Grid */}
                <div className="px-5">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        Recommended Items
                        <div className="h-px flex-1 bg-white/10"></div>
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-8">
                        {PRODUCTS.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
