"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

interface RankingContentProps {
    products: Product[]; // 서버에서 price 내림차순으로 정렬해 전달
}

export function RankingContent({ products }: RankingContentProps) {
    return (
        <div className="min-h-screen bg-black pt-20 pb-20">
            <div className="max-w-7xl mx-auto px-4">

                {/* 1. Header & Filters */}
                <header className="mb-8 sticky top-16 z-40 bg-black/80 backdrop-blur-md py-4 -mx-4 px-4 border-b border-white/5">
                    <h2 className="text-3xl font-black text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                        Real-time Ranking
                        <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full tracking-normal align-middle animate-pulse">Updated</span>
                    </h2>

                    <p className="text-sm text-gray-400">Products ranked by the current catalog order.</p>
                </header>

                {/* 2. Ranking Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-12">
                    {products.map((product, i) => (
                        <Link href={`/product/${product.id}`} key={product.id} className="group flex flex-col gap-3 relative">
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
                            </div>

                            {/* Info */}
                            <div>
                                <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider group-hover:text-purple-400 transition-colors">{product.brand}</p>
                                <p className="text-sm text-gray-200 truncate mb-1.5 font-medium group-hover:text-white transition-colors">{product.name}</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-lg font-bold text-white">{formatPrice(product.price)}</span>
                                    {i < 3 && <span className="text-xs text-red-500 font-bold animate-pulse">HOT</span>}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
