"use client";

import { useRef, useState, useEffect } from "react";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

// Mock Data for "Brand Focus" Carousel (Top Brands from 4910.kr)
// Mock Data for "Brand Focus" Carousel (Top Brands from 4910.kr)
const BRAND_FOCUS_ITEMS = [
    { title: "Urban\nOutdoor", brand: "YOSEMITE", image: "https://images.unsplash.com/photo-1603686249189-4f4d79d3c11e?q=80&w=800&auto=format&fit=crop", logo: "Y" },
    { title: "City\nBoys", brand: "TWN", image: "https://images.unsplash.com/photo-1527719327859-c6ce80353573?q=80&w=800&auto=format&fit=crop", logo: "T" },
    { title: "Modern\nMood", brand: "MUSENT", image: "https://images.unsplash.com/photo-1517502166878-35c93a0072f0?q=80&w=800&auto=format&fit=crop", logo: "M" },
    { title: "Street\nRebel", brand: "G-CREEP", image: "https://images.unsplash.com/photo-1596578188127-9ecb16316323?q=80&w=800&auto=format&fit=crop", logo: "G" },
    { title: "Daily\nEssential", brand: "ELIMENO", image: "https://images.unsplash.com/photo-1604004382251-3d44b83d2903?q=80&w=800&auto=format&fit=crop", logo: "E" },
    { title: "Wide\nSilhouette", brand: "GOOD LIFE WORKS", image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=800&auto=format&fit=crop", logo: "G" },
    { title: "Vintage\nBiker", brand: "HARLEY-DAVIDSON", image: "https://images.unsplash.com/photo-1558981403-c5f11bbdba4d?q=80&w=800&auto=format&fit=crop", logo: "H" },
    { title: "Ivy\nLeague", brand: "YALE", image: "https://images.unsplash.com/photo-1701198424269-e0f348f932e6?q=80&w=800&auto=format&fit=crop", logo: "Y" },
    { title: "Tech\nWear", brand: "BLACKYAK", image: "https://images.unsplash.com/photo-1626084300465-bc1d058516fb?q=80&w=800&auto=format&fit=crop", logo: "B" },
];

interface BrandsContentProps {
    products: Product[];
}

export function BrandsContent({ products }: BrandsContentProps) {
    // Infinite Loop: Triple the items
    const INFINITE_ITEMS = [...BRAND_FOCUS_ITEMS, ...BRAND_FOCUS_ITEMS, ...BRAND_FOCUS_ITEMS];

    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // Initial positioning to middle set
    useEffect(() => {
        if (scrollRef.current) {
            const cardWidth = 272; // 256 + 16
            const singleSetWidth = cardWidth * BRAND_FOCUS_ITEMS.length;
            scrollRef.current.scrollLeft = singleSetWidth;
        }
    }, []);

    // Infinite Scroll Logic (Seamless Jump)
    const onScroll = () => {
        if (scrollRef.current) {
            const cardWidth = 272;
            const singleSetWidth = cardWidth * BRAND_FOCUS_ITEMS.length;
            const scrollPos = scrollRef.current.scrollLeft;

            // If reached start of first set, jump to start of middle set
            if (scrollPos < 10) {
                scrollRef.current.scrollLeft = singleSetWidth + scrollPos;
            }
            // If reached end of middle set, jump to start of middle set
            else if (scrollPos >= singleSetWidth * 2) {
                scrollRef.current.scrollLeft = scrollPos - singleSetWidth;
            }
        }
    };

    // Mouse Drag Logic (Global Window Events)
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!scrollRef.current) return;
            e.preventDefault();
            const x = e.pageX - scrollRef.current.offsetLeft;
            const walk = (x - startX) * 0.7; // Viscous Drag (0.7)
            scrollRef.current.scrollLeft = scrollLeft - walk;
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, startX, scrollLeft]);

    const onMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    return (
        <div className="min-h-screen bg-black pt-20 pb-20"> {/* Dark background, adjusted pt for new header */}
            <div className="max-w-7xl mx-auto">

                {/* 1. Brand Focus Carousel (Infinite Draggable) */}
                <section className="px-4 py-8">
                    <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                        Featured Brands
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    </h2>
                    <div
                        ref={scrollRef}
                        className={cn(
                            "flex gap-4 overflow-x-auto pb-8 select-none perspective-1000",
                            // Force Hide Scrollbar
                            "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
                            isDragging ? "cursor-grabbing scroll-auto" : "cursor-grab scroll-smooth"
                        )}
                        onMouseDown={onMouseDown}
                        onScroll={onScroll}
                    >
                        {INFINITE_ITEMS.map((item, i) => (
                            <div key={`${item.brand}-${i}`} className="relative shrink-0 w-72 aspect-3/4 rounded-2xl overflow-hidden group transition-all duration-500 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] border border-white/10 hover:border-purple-500/50">
                                <Image
                                    src={item.image}
                                    alt={item.brand}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-6">
                                    <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white font-bold mb-4 border border-white/20 group-hover:bg-purple-600 group-hover:border-purple-400 transition-colors">
                                        {item.logo}
                                    </div>
                                    <h3 className="text-white text-2xl font-black leading-none mb-2 whitespace-pre-line uppercase tracking-tight shadow-black drop-shadow-lg">{item.title}</h3>
                                    <p className="text-gray-400 text-sm font-medium tracking-widest">{item.brand}</p>
                                    <Link href={`/search?q=${encodeURIComponent(item.brand)}`} className="mt-3 w-fit text-xs font-bold text-white underline decoration-purple-400 underline-offset-4">View brand products</Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 3. Product Grid (Brand Focus Mode) */}
                <section className="px-4 mt-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white">Trending Now</h3>
                        <div className="flex gap-2 text-sm text-gray-400">
                            <span>Sort by:</span>
                            <span className="text-purple-400 font-bold">Popular</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10">
                        {products.map((product) => (
                            <Link href={`/product/${product.id}`} key={product.id} className="group flex flex-col gap-3">
                                {/* Image */}
                                <div className="relative aspect-3/4 bg-zinc-900 rounded-xl overflow-hidden border border-white/5 group-hover:border-purple-500/30 transition-colors">
                                    <Image
                                        src={product.imageUrl}
                                        alt={product.name}
                                        fill
                                        className="object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                                    />
                                </div>

                                {/* Info */}
                                <div>
                                    <p className="text-xs font-bold text-purple-400 mb-1 tracking-wider uppercase">{product.brand}</p>
                                    <p className="text-sm text-gray-300 truncate mb-1.5 group-hover:text-white transition-colors">{product.name}</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-base font-bold text-white">{(Math.round(product.price * 0.003)).toLocaleString()} AED</span>
                                        <span className="text-xs text-zinc-400 line-through">{(Math.round(product.price * 0.004)).toLocaleString()}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
