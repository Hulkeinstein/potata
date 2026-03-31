"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

import { HeartButton } from "@/components/common/HeartButton";

interface ProductCardProps {
    product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
    const router = useRouter();
    const [imageError, setImageError] = useState(false);

    const handleTryOn = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(`/try-on?product=${product.id}`);
    };

    return (
        <Link
            href={`/product/${product.id}`}
            className="group relative flex flex-col gap-2 focus:outline-none focus:ring-2 focus:ring-brand-neon focus:ring-offset-2 rounded-lg"
            aria-label={`${product.brand} ${product.name}, ${formatPrice(product.price)}`}
        >
            {/* Image Container */}
            <div className="relative aspect-3/4 w-full overflow-hidden rounded-lg bg-zinc-900 border border-white/5 group-hover:border-purple-500/30 transition-colors">
                {!imageError ? (
                    <Image
                        src={product.imageUrl}
                        alt={`${product.brand} ${product.name}`}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                        <span className="text-gray-400 text-sm">Image unavailable</span>
                    </div>
                )}

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1" aria-label="Product badges">
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
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <HeartButton productId={product.id} />
                </div>

                <button
                    onClick={handleTryOn}
                    className="bg-white/90 p-2 rounded-full shadow-lg hover:bg-brand-neon hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-brand-neon absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Try on with AI"
                >
                    <Sparkles className="w-4 h-4 text-black" aria-hidden="true" />
                </button>
            </div>

            {/* Info */}
            <div className="flex flex-col gap-0.5 px-1">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-0.5">{product.brand}</span>
                <h3 className="text-sm text-gray-300 font-medium truncate group-hover:text-white transition-colors">
                    {product.name}
                </h3>

                <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-base font-bold text-white">
                        {formatPrice(product.price)}
                    </span>
                    {product.originalPrice && (
                        <span className="text-xs text-gray-400 line-through">
                            {formatPrice(product.originalPrice)}
                        </span>
                    )}
                    {product.discountRate && (
                        <span className="text-xs text-red-600 font-bold">
                            {product.discountRate}%
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
