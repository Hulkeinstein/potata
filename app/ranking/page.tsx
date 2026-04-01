"use client";

import { useState } from "react";
import Image from "next/image";
import { PRODUCTS } from "@/data/dummy";
import { cn } from "@/lib/utils";

// Mock Categories
const CATEGORIES = ["ALL", "TOP", "OUTER", "PANTS", "DRESS", "SKIRT", "BAG", "SHOES", "ACC"];

// Dummy brand data for Brands tab
const BRANDS = [
    { id: "1", name: "The North Face White Label", logo: "🏔️", followers: 128400, ranking: 1, category: "Outdoor", isHot: true },
    { id: "2", name: "Nike ACG", logo: "✔️", followers: 98200, ranking: 2, category: "Sport", isHot: true },
    { id: "3", name: "Nike", logo: "✔️", followers: 87300, ranking: 3, category: "Sport", isHot: true },
    { id: "4", name: "Casio", logo: "⌚", followers: 56100, ranking: 4, category: "Accessories", isHot: false },
    { id: "5", name: "IAB Studio", logo: "🎨", followers: 43700, ranking: 5, category: "Streetwear", isHot: false },
    { id: "6", name: "AMOU", logo: "🧥", followers: 38900, ranking: 6, category: "Casual", isHot: false },
    { id: "7", name: "Adidas Originals", logo: "🌸", followers: 31200, ranking: 7, category: "Sport", isHot: false },
    { id: "8", name: "Stone Island", logo: "🔮", followers: 27500, ranking: 8, category: "Luxury", isHot: false },
];

export default function RankingPage() {
    const [activeCategory, setActiveCategory] = useState("ALL");
    const [selectedType, setSelectedType] = useState("Products"); // Products | Brands

    // Sorting mock for ranking
    const sortedProducts = [...PRODUCTS].sort((a, b) => b.price - a.price);

    return (
        <div className="min-h-screen bg-black pt-20 pb-20">
            <div className="max-w-7xl mx-auto px-4">

                {/* 1. Header & Filters */}
                <header className="mb-8 sticky top-16 z-40 bg-black/80 backdrop-blur-md py-4 -mx-4 px-4 border-b border-white/5">
                    <h2 className="text-3xl font-black text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                        Real-time Ranking
                        <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full tracking-normal align-middle animate-pulse">Updated</span>
                    </h2>

                    {/* Category Filter (Capsule) */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={cn(
                                    "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 border",
                                    activeCategory === cat
                                        ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105"
                                        : "bg-zinc-900/50 text-gray-400 border-white/10 hover:border-white/30 hover:text-white"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Type Tabs (Underline) */}
                    <div className="flex gap-8 border-b border-white/10">
                        {["Products", "Brands"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setSelectedType(tab)}
                                className={cn(
                                    "pb-3 text-sm font-bold uppercase tracking-wider transition-all relative",
                                    selectedType === tab ? "text-white" : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                {tab}
                                {selectedType === tab && (
                                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-linear-to-r from-purple-500 to-blue-500 shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
                                )}
                            </button>
                        ))}
                    </div>
                </header>

                {/* 2. Ranking Grid — Products */}
                {selectedType === "Products" && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-12">
                        {sortedProducts.map((product, i) => (
                            <div key={i} className="group cursor-pointer flex flex-col gap-3 relative">
                                {/* Ranking Badge (Cinematic Style) */}
                                <div className="absolute top-0 left-0 z-10 w-10 h-10 bg-black text-white flex items-center justify-center font-black text-lg border-b border-r border-white/10 rounded-br-2xl shadow-lg">
                                    {i + 1}
                                </div>

                                {/* Image */}
                                <div className="relative aspect-3/4 bg-zinc-900 rounded-xl overflow-hidden border border-white/5 transition-all duration-300 group-hover:border-purple-500/50 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                                    <Image
                                        src={product.imageUrl}
                                        alt={product.name}
                                        fill
                                        className="object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                                    />
                                    {/* Quick Add Overlay */}
                                    <div className="absolute bottom-3 right-3 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                        <div className="w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-purple-600 text-white border border-white/10">
                                            +
                                        </div>
                                    </div>
                                </div>

                                {/* Info */}
                                <div>
                                    <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider group-hover:text-purple-400 transition-colors">{product.brand}</p>
                                    <p className="text-sm text-gray-200 truncate mb-1.5 font-medium group-hover:text-white transition-colors">{product.name}</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-lg font-bold text-white">{(Math.round(product.price * 0.003)).toLocaleString()} AED</span>
                                        {i < 3 && <span className="text-xs text-red-500 font-bold animate-pulse">HOT</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 2b. Brands List */}
                {selectedType === "Brands" && (
                    <div className="flex flex-col gap-4">
                        {BRANDS.map((brand, i) => (
                            <div
                                key={brand.id}
                                className="group flex items-center gap-5 p-4 rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-purple-500/40 hover:bg-zinc-900/70 transition-all duration-300 cursor-pointer"
                            >
                                {/* Rank */}
                                <div className="w-8 text-center font-black text-lg text-gray-500 group-hover:text-white transition-colors shrink-0">
                                    {brand.ranking}
                                </div>

                                {/* Logo placeholder */}
                                <div className="w-14 h-14 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-2xl shrink-0 group-hover:border-purple-500/50 transition-colors">
                                    {brand.logo}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className="font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                                            {brand.name}
                                        </p>
                                        {brand.isHot && (
                                            <span className="text-xs text-red-500 font-bold animate-pulse shrink-0">HOT</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">{brand.category}</p>
                                </div>

                                {/* Followers */}
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-bold text-white">{brand.followers.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">followers</p>
                                </div>

                                {/* Follow button */}
                                <button className="shrink-0 px-4 py-1.5 rounded-full border border-white/20 text-xs font-bold text-gray-300 hover:border-purple-500 hover:text-purple-400 transition-colors">
                                    Follow
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
