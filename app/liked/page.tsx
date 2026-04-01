"use client";

import { useEffect, useState } from "react";
import { useWishlistStore } from "@/store/wishlist-store";
import { PRODUCTS } from "@/data/dummy";
import { ProductCard } from "@/components/ui/ProductCard";
import { Heart, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LikedPage() {
    const { items: likedIds } = useWishlistStore();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Filter products
    const likedProducts = PRODUCTS.filter((p) => likedIds.includes(p.id));

    if (!isClient) return <div className="min-h-screen bg-black" />;

    return (
        <div className="min-h-screen bg-black pt-24 px-4 pb-20">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <Heart className="w-8 h-8 text-brand-neon fill-brand-neon" />
                    <h1 className="text-3xl font-bold font-outfit text-white">Liked Items</h1>
                    <span className="text-zinc-400 text-lg font-medium">({likedProducts.length})</span>
                </div>

                {likedProducts.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
                        {likedProducts.map((product, idx) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <ProductCard product={product} />
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
                            <Heart className="w-10 h-10 text-zinc-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Your wishlist is empty</h2>
                        <p className="text-zinc-400 mb-8">Save items you love to find them easily later.</p>
                        <Link
                            href="/shop"
                            className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-brand-neon transition-colors flex items-center gap-2"
                        >
                            Start Shopping <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
