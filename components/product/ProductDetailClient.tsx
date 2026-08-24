"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/utils";
import { ReviewSection } from "@/components/product/ReviewSection";
import { QASection } from "@/components/product/QASection";
import { ProductPurchaseActions } from "@/components/product/ProductPurchaseActions";

interface ProductDetailClientProps {
    product: Product;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
    const [activeTab, setActiveTab] = useState("detail");
    const tabsRef = useRef<HTMLDivElement>(null);

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
    const productRating = product.rating || 0;
    const productReviewCount = product.reviewCount || 0;
    const productDiscount = product.discountRate || 0;
    const productOriginalPrice = product.originalPrice || product.price;

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
                                <Link href={`/search?q=${encodeURIComponent(product.brand)}`} className="text-zinc-400 font-medium tracking-wide mb-2 hover:text-white transition-colors w-fit block">
                                    {product.brand} &rarr;
                                </Link>
                                <h1 className="text-3xl font-bold font-outfit leading-tight mb-2">
                                    {product.name}
                                </h1>
                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                    <div className="flex items-center text-yellow-500">
                                        <Star className="w-4 h-4 fill-current" />
                                        <span className="ml-1 font-bold text-white">{productRating.toFixed(1)}</span>
                                    </div>
                                    <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                                    <button onClick={() => { setActiveTab("review"); tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="underline decoration-zinc-700 hover:text-white">
                                        {productReviewCount} Reviews
                                    </button>
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

                            {/* Tags */}
                            {product.tags && product.tags.length > 0 && (
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-zinc-300">태그</label>
                                    <div className="flex flex-wrap gap-2">
                                        {product.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-4 py-2 rounded-full border border-brand-neon/40 bg-brand-neon/15 text-brand-neon text-sm"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <ProductPurchaseActions product={product} imageUrl={productImages[0]} />

                        </div>
                    </div>

                </div>

                {/* Bottom Section: Sticky Tabs & Content */}
                <div ref={tabsRef} className="mt-24 scroll-mt-20">
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
                                <ReviewSection productId={product.id} />
                            )}

                            {/* Q&A Tab */}
                            {activeTab === "q&a" && (
                                <QASection productId={product.id} />
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
