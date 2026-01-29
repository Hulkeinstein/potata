"use client";

import { Product } from "@/data/dummy";
import { Sparkles, Heart } from "lucide-react";
import Image from "next/image";

interface ProductCardProps {
    product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
    return (
        <div className="group relative flex flex-col gap-2">
            {/* Image Container */}
            <div className="relative aspect-3/4 w-full overflow-hidden rounded-lg bg-gray-100">
                <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {product.isBest && (
                        <span className="bg-black/80 text-white text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider">
                            Best
                        </span>
                    )}
                    {product.isNew && (
                        <span className="bg-brand-neon text-black text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider">
                            New
                        </span>
                    )}
                </div>

                {/* Quick Actions (Hover) */}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                    <button className="bg-white/90 p-2 rounded-full shadow-lg hover:bg-brand-neon hover:text-black transition-colors">
                        <Sparkles className="w-4 h-4 text-black" />
                    </button>
                    <button className="bg-white/90 p-2 rounded-full shadow-lg hover:text-red-500 transition-colors">
                        <Heart className="w-4 h-4 text-black" />
                    </button>
                </div>
            </div>

            {/* Info */}
            <div className="flex flex-col gap-0.5 px-1">
                <span className="text-xs font-bold text-gray-900">{product.brand}</span>
                <h3 className="text-sm text-gray-600 font-light truncate group-hover:text-black transition-colors">{product.name}</h3>

                <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-sm font-bold text-gray-900">AED {Math.round(product.price * 0.003)}</span>
                    {product.originalPrice && (
                        <span className="text-xs text-gray-400 line-through">AED {Math.round(product.originalPrice * 0.003)}</span>
                    )}
                    {product.discountRate && (
                        <span className="text-xs text-red-600 font-bold">{product.discountRate}%</span>
                    )}
                </div>
            </div>
        </div>
    );
}
