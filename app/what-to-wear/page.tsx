"use client";

import Image from "next/image";
import { Heart } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import type { OOTD } from "@/types";

// Mock OOTD Data
const OOTDS: OOTD[] = [
    { id: 1, user: "@sarah.k", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80", likes: 120, desc: "Lovely jacket for Dubai winter! ❄️", product: "Classic Tweed Jacket" },
    { id: 2, user: "@fashion_dubai", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80", likes: 85, desc: "Modest and chic. Love the fit.", product: "Oversized Trench" },
    { id: 3, user: "@mina_style", image: "https://images.unsplash.com/photo-1550246140-29f40b909e5a?w=800&q=80", likes: 210, desc: "Perfect for weekend brunch!", product: "Wool Knit Vest" },
    { id: 4, user: "@jina_daily", image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80", likes: 45, desc: "Color is amazing.", product: "Crop Hoodie" },
    { id: 5, user: "@k_vibe", image: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&q=80", likes: 300, desc: "Best purchase ever.", product: "Wide Slacks" },
    { id: 6, user: "@luna_moon", image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80", likes: 150, desc: "So comfy!", product: "Cotton Shirt" },
];

export default function WhatToWearPage() {
    return (
        <div className="min-h-screen bg-black pb-20 pt-16 text-white">
            {/* Header */}
            <div className="sticky top-16 z-10 bg-black/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 h-14">
                <h1 className="text-lg font-bold tracking-tight">What to Wear?</h1>
                <button className="text-xs font-bold bg-white text-black px-4 py-1.5 rounded-full hover:bg-gray-200 transition-colors">
                    Post My Look
                </button>
            </div>

            {/* Pinterest/Masonry Style Feed */}
            <div className="columns-2 md:columns-3 gap-4 px-4 py-6 space-y-4">
                {OOTDS.map((item) => (
                    <div key={item.id} className="break-inside-avoid relative group rounded-xl overflow-hidden bg-zinc-900 mb-4 border border-white/5 hover:border-purple-500/50 transition-colors">
                        <div className="relative w-full">
                            {/* Image Container with Loading State */}
                            <ImageWrapper item={item} />

                            {/* Overlay Gradient */}
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            {/* Product Tag (Mock) */}
                            <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-300">
                                <p className="text-white text-xs font-medium mb-2 line-clamp-2 drop-shadow-md">{item.desc}</p>
                                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-2 flex items-center justify-between">
                                    <span className="text-xs font-bold text-white truncate flex-1 mr-2">{item.product}</span>
                                    <span className="text-[10px] bg-white text-black px-2 py-0.5 rounded font-bold">SHOP</span>
                                </div>
                            </div>
                        </div>

                        {/* User Info Bar */}
                        <div className="absolute top-2 left-2 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-zinc-800 overflow-hidden border border-white/20">
                                {/* Avatar Mock */}
                                <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.user}`} alt="avatar" width={24} height={24} />
                            </div>
                            <span className="text-xs font-bold text-white shadow-black drop-shadow-md">{item.user}</span>
                        </div>

                        {/* Like Button */}
                        <button className="absolute top-2 right-2 flex items-center gap-1 text-white drop-shadow-md hover:text-red-500 transition-colors">
                            <Heart className="w-4 h-4" />
                            <span className="text-xs font-bold">{item.likes}</span>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Sub-component to handle individual image loading states
function ImageWrapper({ item }: { item: OOTD }) {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <>
            {isLoading && (
                <Skeleton className="w-full aspect-[3/4] mb-2" />
            )}
            <Image
                src={item.image}
                alt={item.desc}
                width={500}
                height={500}
                onLoad={() => setIsLoading(false)}
                className={cn(
                    "w-full h-auto object-cover transition-opacity duration-500",
                    isLoading ? "opacity-0 absolute inset-0" : "opacity-90 group-hover:opacity-100"
                )}
            />
        </>
    );
}
