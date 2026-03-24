"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Data aligned with CATEGORIES
const CATEGORIES_DATA = [
    {
        id: "Outer",
        name: "Outer",
        image: "https://images.unsplash.com/photo-1551028919-ac66c5f8b6b0?q=80&w=987&auto=format&fit=crop",
        subCategories: [
            { name: "Jackets", image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=1936&auto=format&fit=crop" },
            { name: "Coats", image: "https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?q=80&w=987&auto=format&fit=crop" },
            { name: "Padding", image: "https://images.unsplash.com/photo-1517409890289-5f2129e06cd2?q=80&w=987&auto=format&fit=crop" },
            { name: "Cardigans", image: "https://images.unsplash.com/photo-1601614769062-841f391a27f7?q=80&w=2070&auto=format&fit=crop" },
        ]
    },
    {
        id: "Top",
        name: "Top",
        image: "https://images.unsplash.com/photo-1551488852-080175b92648?q=80&w=2072&auto=format&fit=crop",
        subCategories: [
            { name: "T-Shirts", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1780&auto=format&fit=crop" },
            { name: "Shirts", image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=2070&auto=format&fit=crop" },
            { name: "Sweatshirts", image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=2070&auto=format&fit=crop" },
            { name: "Hoodies", image: "https://images.unsplash.com/photo-1492446845049-9c50cc313f00?q=80&w=1587&auto=format&fit=crop" },
        ]
    },
    {
        id: "Bottom",
        name: "Bottom",
        image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1287&auto=format&fit=crop",
        subCategories: [
            { name: "Denim", image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1287&auto=format&fit=crop" },
            { name: "Slacks", image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=987&auto=format&fit=crop" },
            { name: "Joggers", image: "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?q=80&w=988&auto=format&fit=crop" },
            { name: "Shorts", image: "https://images.unsplash.com/photo-1565538356163-548c21cb24a6?q=80&w=1035&auto=format&fit=crop" },
        ]
    },
    {
        id: "Dress",
        name: "Dress",
        image: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?q=80&w=2064&auto=format&fit=crop",
        subCategories: [
            { name: "Mini", image: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?q=80&w=2064&auto=format&fit=crop" },
            { name: "Long", image: "https://images.unsplash.com/photo-1605763240004-7e93b172d754?q=80&w=987&auto=format&fit=crop" },
            { name: "One-piece", image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=1083&auto=format&fit=crop" },
        ]
    },
    {
        id: "Acc",
        name: "Acc",
        image: "https://images.unsplash.com/photo-1599643478518-17488fbbcd75?q=80&w=987&auto=format&fit=crop",
        subCategories: [
            { name: "Hats", image: "https://images.unsplash.com/photo-1533827432537-70133748f5c8?q=80&w=2070&auto=format&fit=crop" },
            { name: "Bags", image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=2069&auto=format&fit=crop" },
            { name: "Jewelry", image: "https://images.unsplash.com/photo-1515562141207-7a88fb05220c?q=80&w=2070&auto=format&fit=crop" },
        ]
    },
    {
        id: "Shoes",
        name: "Shoes",
        image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=2012&auto=format&fit=crop",
        subCategories: [
            { name: "Sneakers", image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=2012&auto=format&fit=crop" },
            { name: "Boots", image: "https://images.unsplash.com/photo-1608256246200-53e635b5b69f?q=80&w=987&auto=format&fit=crop" },
            { name: "Sandals", image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1780&auto=format&fit=crop" },
        ]
    },
];

export default function CategoryPage() {
    const [selectedCategory, setSelectedCategory] = useState(CATEGORIES_DATA[0]);

    return (
        <div className="min-h-screen bg-black pt-16 flex flex-col md:flex-row">

            {/* Mobile Sidebar (Fixed Left) */}
            <div className="md:w-64 w-24 h-[calc(100vh-64px)] fixed left-0 top-16 border-r border-white/10 bg-zinc-900 overflow-y-auto hidden md:block z-40">
                {CATEGORIES_DATA.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                            "w-full p-4 flex items-center justify-between text-left transition-all border-b border-white/5",
                            selectedCategory.id === cat.id
                                ? "bg-black text-brand-neon border-l-4 border-l-brand-neon"
                                : "text-zinc-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <span className="font-bold text-lg">{cat.name}</span>
                        {selectedCategory.id === cat.id && <ChevronRight className="w-5 h-5" />}
                    </button>
                ))}
            </div>

            {/* Mobile Horizontal Top Bar */}
            <div className="md:hidden fixed top-16 left-0 w-24 h-[calc(100vh-64px)] bg-zinc-900 border-r border-white/10 overflow-y-auto z-40">
                {CATEGORIES_DATA.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                            "w-full py-6 flex flex-col items-center gap-2 text-center transition-all border-b border-white/5",
                            selectedCategory.id === cat.id
                                ? "bg-black text-brand-neon relative after:content-[''] after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-brand-neon"
                                : "text-zinc-500"
                        )}
                    >
                        <div className="relative w-8 h-8 rounded-full overflow-hidden opacity-80">
                            <Image src={cat.image} alt={cat.name} fill className="object-cover" />
                        </div>
                        <span className={cn("text-xs font-medium", selectedCategory.id === cat.id && "font-bold")}>
                            {cat.name}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 md:ml-64 ml-24 min-h-[calc(100vh-64px)] bg-black p-4 md:p-8">

                {/* Header with Visual */}
                <motion.div
                    key={selectedCategory.id + "-header"}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative w-full h-32 md:h-48 rounded-xl overflow-hidden mb-8 border border-white/10"
                >
                    <Image
                        src={selectedCategory.image}
                        alt={selectedCategory.name}
                        fill
                        className="object-cover opacity-60"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent flex items-center px-8">
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black font-outfit text-white uppercase italic tracking-tighter">
                                {selectedCategory.name}
                            </h1>
                            <p className="text-zinc-400 text-sm mt-1">Explore the latest {selectedCategory.name} trends</p>
                        </div>
                    </div>
                </motion.div>

                {/* Sub Categories Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <AnimatePresence mode="popLayout">
                        {selectedCategory.subCategories.map((sub, idx) => (
                            <Link href={`/shop?category=${selectedCategory.id}`} key={sub.name} className="block">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="group relative aspect-[3/4] bg-zinc-900 rounded-lg overflow-hidden border border-white/5 cursor-pointer"
                                >
                                    <Image
                                        src={sub.image}
                                        alt={sub.name}
                                        fill
                                        className="object-cover group-hover:scale-110 transition-transform duration-500 opacity-70 group-hover:opacity-100"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4">
                                        <h3 className="text-white font-bold text-lg">{sub.name}</h3>
                                        <div className="flex items-center text-brand-neon text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                            Shop Now <ArrowRight className="w-3 h-3 ml-1" />
                                        </div>
                                    </div>
                                </motion.div>
                            </Link>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
