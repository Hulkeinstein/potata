"use client";

import { useRef } from "react";
import { TRENDS } from "@/data/dummy";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function K_TrendSection() {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: "left" | "right") => {
        if (scrollRef.current) {
            const scrollAmount = direction === "left" ? -420 : 420; // Card width + gap
            scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
    };

    return (
        <section className="w-full bg-black py-16 text-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 flex justify-between items-end">
                <div>
                    <span className="text-brand-neon font-bold tracking-wider text-xs uppercase mb-2 block">Curated for UAE</span>
                    <h2 className="text-3xl font-bold">Trending in Seoul</h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => scroll("left")} aria-label="Scroll left" className="p-2 border border-white/20 rounded-full hover:bg-white/10 transition-colors">
                        <ArrowRight className="w-5 h-5 rotate-180" />
                    </button>
                    <button onClick={() => scroll("right")} aria-label="Scroll right" className="p-2 border border-white/20 rounded-full hover:bg-white/10 transition-colors">
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Horizontal Scroll Container */}
            <div ref={scrollRef} className="flex gap-6 overflow-x-auto px-4 sm:px-6 lg:px-8 pb-8 no-scrollbar snap-x scroll-smooth">
                {TRENDS.map((trend) => (
                    <Link href={`/search?q=${encodeURIComponent(trend.title)}`} key={trend.id} className="relative min-w-[300px] md:min-w-[400px] aspect-video rounded-xl overflow-hidden shrink-0 snap-center group border border-white/5 hover:border-purple-500/50 transition-colors">
                        <Image
                            src={trend.imageUrl}
                            alt={trend.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent"></div>
                        <div className="absolute bottom-6 left-6">
                            <h3 className="text-xl font-bold mb-1">{trend.title}</h3>
                            <p className="text-gray-300 text-sm">{trend.description}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
