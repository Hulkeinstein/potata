"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Heart, Share2, Plus, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/utils";

interface ProductDetailClientProps {
    product: Product;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string>(product.colors?.[0] || "Default");
    const [activeTab, setActiveTab] = useState("detail");
    const { addItem } = useCartStore();

    // HOT 랭킹용 조회수 트래킹 — 세션당 1회, fire-and-forget
    const viewTracked = useRef(false);
    useEffect(() => {
        if (viewTracked.current) return;            // dev StrictMode 이중 마운트 방지
        viewTracked.current = true;
        const key = `viewed:${product.id}`;
        try {
            if (sessionStorage.getItem(key)) return;  // 같은 세션 중복 방지
            sessionStorage.setItem(key, "1");
        } catch {
            // sessionStorage 불가 환경(사생활 모드 등) — 무시하고 카운트 시도
        }
        // fire-and-forget — 렌더/네비 블록 없음, 실패 조용히
        fetch(`/api/products/${product.id}/view`, { method: "POST" }).catch(() => {});
    }, [product.id]);

    // Fallback values for optional fields
    const productImages = product.images && product.images.length > 0 ? product.images : [product.imageUrl];
    const productSizes = product.sizes || ["Free"];
    const productColors = product.colors || ["Default"];
    const productRating = product.rating || 0;
    const productReviewCount = product.reviewCount || 0;
    const productDiscount = product.discountRate || 0;
    const productOriginalPrice = product.originalPrice || product.price;

    const handleAddToCart = () => {
        if (!selectedSize && productSizes[0] !== "Free" && productSizes[0] !== "One Size") {
            if (productSizes.length > 0 && !selectedSize) {
                alert("Please select a size.");
                return;
            }
        }

        const sizeToUse = selectedSize || productSizes[0];

        addItem({
            product: {
                ...product,
                imageUrl: productImages[0],
            },
            quantity: 1,
            color: selectedColor,
            size: sizeToUse,
        });
    };

    return (
        <div className="min-h-screen bg-black text-white pt-20 pb-32">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Main Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* Left: Image Gallery (Vertical Stack) */}
                    <div className="lg:col-span-7 flex flex-col gap-4">
                        {productImages.map((img, idx) => (
                            <div key={idx} className="relative w-full aspect-4/5 bg-zinc-900 rounded-lg overflow-hidden border border-white/5">
                                <Image
                                    src={img}
                                    alt={`${product.name} - ${idx + 1}`}
                                    fill
                                    className="object-cover hover:scale-105 transition-transform duration-700 ease-out"
                                    priority={idx === 0}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Right: Sticky Info Panel */}
                    <div className="lg:col-span-5 relative">
                        <div className="sticky top-24 space-y-8">

                            {/* Brand & Title */}
                            <div>
                                <h3 className="text-zinc-400 font-medium tracking-wide mb-2 hover:text-white transition-colors cursor-pointer w-fit">
                                    {product.brand} &rarr;
                                </h3>
                                <h1 className="text-3xl font-bold font-outfit leading-tight mb-2">
                                    {product.name}
                                </h1>
                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                    <div className="flex items-center text-yellow-500">
                                        <Star className="w-4 h-4 fill-current" />
                                        <span className="ml-1 font-bold text-white">{productRating}</span>
                                    </div>
                                    <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                                    <span className="underline decoration-zinc-700 hover:text-white cursor-pointer">
                                        {productReviewCount} Reviews
                                    </span>
                                </div>
                            </div>

                            {/* Price */}
                            <div className="flex items-end gap-3 pb-6 border-b border-white/10">
                                <span className="text-3xl font-bold text-brand-neon">
                                    {formatPrice(product.price)}
                                </span>
                                {productDiscount > 0 && (
                                    <>
                                        <span className="text-xl text-zinc-400 line-through mb-1">
                                            {formatPrice(productOriginalPrice)}
                                        </span>
                                        <span className="text-xl text-red-500 font-bold mb-1">
                                            {productDiscount}%
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Options */}
                            <div className="space-y-6">
                                {/* Colors */}
                                {productColors.length > 0 && (
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-zinc-300">Color</label>
                                        <div className="flex flex-wrap gap-2">
                                            {productColors.map((color) => (
                                                <button
                                                    key={color}
                                                    onClick={() => setSelectedColor(color)}
                                                    className={cn(
                                                        "px-4 py-2 rounded-full border text-sm transition-all",
                                                        selectedColor === color
                                                            ? "border-brand-neon text-brand-neon bg-brand-neon/10"
                                                            : "border-white/10 text-zinc-400 hover:border-white/30"
                                                    )}
                                                >
                                                    {color}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Sizes */}
                                {productSizes.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium text-zinc-300">Size</label>
                                            <span className="text-xs text-zinc-400 underline cursor-pointer hover:text-white">Size Guide</span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {productSizes.map((size) => (
                                                <button
                                                    key={size}
                                                    onClick={() => setSelectedSize(size)}
                                                    className={cn(
                                                        "py-3 rounded-lg border text-sm font-medium transition-all",
                                                        selectedSize === size
                                                            ? "border-brand-neon text-black bg-brand-neon"
                                                            : "border-white/10 text-zinc-400 hover:border-white/30 hover:bg-white/5"
                                                    )}
                                                >
                                                    {size}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Selection Summary */}
                            <AnimatePresence>
                                {(selectedSize || selectedColor) && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2 overflow-hidden"
                                    >
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-zinc-300">
                                                {product.name}
                                                <div className="text-zinc-400 text-xs mt-0.5">
                                                    {selectedColor} {selectedSize ? `/ ${selectedSize}` : ""}
                                                </div>
                                            </span>
                                            <X className="w-4 h-4 text-zinc-400 cursor-pointer hover:text-white" onClick={() => { setSelectedSize(null); setSelectedColor(productColors[0]) }} />
                                        </div>
                                        <div className="flex justify-between items-end border-t border-white/5 pt-2 mt-2">
                                            <div className="flex items-center gap-3 bg-black/20 rounded px-2 py-1">
                                                <button className="p-1 hover:text-white text-zinc-400"><Minus className="w-3 h-3" /></button>
                                                <span className="text-sm font-medium">1</span>
                                                <button className="p-1 hover:text-white text-zinc-400"><Plus className="w-3 h-3" /></button>
                                            </div>
                                            <span className="font-bold text-lg text-white">{formatPrice(product.price)}</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={handleAddToCart}
                                    className="flex-1 bg-white text-black h-14 rounded-xl font-bold text-lg hover:bg-brand-neon transition-colors flex items-center justify-center gap-2"
                                >
                                    Add to Cart
                                </button>
                                <button className="w-14 h-14 rounded-xl border border-white/10 flex items-center justify-center hover:border-brand-neon hover:text-brand-neon transition-colors">
                                    <Heart className="w-6 h-6" />
                                </button>
                                <button className="w-14 h-14 rounded-xl border border-white/10 flex items-center justify-center hover:border-white/50 transition-colors">
                                    <Share2 className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Banner */}
                            <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm">
                                <p className="text-sm text-zinc-300">
                                    <span className="text-brand-neon font-bold mr-2">N pay</span>
                                    <span className="font-bold">20 AED</span> 적립 받기
                                </p>
                            </div>

                        </div>
                    </div>

                </div>

                {/* Bottom Section: Sticky Tabs & Content */}
                <div className="mt-24">
                    {/* Sticky Tabs */}
                    <div className="sticky top-16 z-30 bg-black/80 backdrop-blur-md border-b border-white/10 mb-12">
                        <div className="flex gap-8">
                            {["Detail", "Review", "Q&A"].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab.toLowerCase())}
                                    className={cn(
                                        "py-4 text-sm font-medium border-b-2 transition-colors relative",
                                        activeTab === tab.toLowerCase()
                                            ? "border-brand-neon text-brand-neon"
                                            : "border-transparent text-zinc-400 hover:text-white"
                                    )}
                                >
                                    {tab}
                                    {tab === "Review" && <span className="ml-1 text-xs text-zinc-400 font-normal">({productReviewCount})</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[800px] grid grid-cols-12 gap-8">
                        <div className="col-span-12 lg:col-span-8 space-y-12">

                            {/* Detail Tab */}
                            {activeTab === "detail" && (
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold mb-6">Product Detail</h3>
                                    <p className="text-gray-300 leading-relaxed mb-8">
                                        {product.description || "No description available."}
                                    </p>
                                    {productImages.map((img, idx) => (
                                        <div key={idx} className="relative w-full aspect-4/6 bg-zinc-900 rounded-lg overflow-hidden border border-white/5">
                                            <Image
                                                src={img}
                                                alt={`${product.name} detail ${idx + 1}`}
                                                fill
                                                className="object-cover hover:scale-105 transition-transform duration-700 ease-out"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Review Tab */}
                            {activeTab === "review" && (
                                <div className="pt-4">
                                    <h3 className="text-xl font-bold mb-6 flex justify-between items-center">
                                        Reviews
                                        <span className="text-sm font-normal text-brand-neon cursor-pointer">Write a Review</span>
                                    </h3>
                                    <div className="py-20 flex flex-col items-center justify-center text-center gap-3 bg-zinc-900/20 rounded-xl border border-white/5">
                                        <Star className="w-10 h-10 text-zinc-700" />
                                        <p className="text-zinc-400 font-medium">No reviews yet. Be the first to review!</p>
                                        <button className="mt-2 px-6 py-2 rounded-full border border-brand-neon text-brand-neon text-sm font-medium hover:bg-brand-neon hover:text-black transition-colors">
                                            Write a Review
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Q&A Tab */}
                            {activeTab === "q&a" && (
                                <div className="pt-4">
                                    <h3 className="text-xl font-bold mb-6 flex justify-between items-center">
                                        Q&amp;A
                                        <span className="text-sm font-normal text-brand-neon cursor-pointer">Ask a Question</span>
                                    </h3>
                                    <div className="py-20 flex flex-col items-center justify-center text-center gap-3 bg-zinc-900/20 rounded-xl border border-white/5">
                                        <svg className="w-10 h-10 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-zinc-400 font-medium">No questions yet. Ask a question!</p>
                                        <button className="mt-2 px-6 py-2 rounded-full border border-brand-neon text-brand-neon text-sm font-medium hover:bg-brand-neon hover:text-black transition-colors">
                                            Ask a Question
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Right Sidebar for Bottom (Optional) */}
                        <div className="hidden lg:block col-span-4">
                            {/* Additional Recommendations or Sticky info if needed */}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
