"use client";

import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { PRODUCTS } from "@/data/dummy";
import { Upload, Sparkles, Shirt, Camera } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function TryOnPage() {
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = () => {
        if (!selectedProduct) return;
        setIsGenerating(true);
        setTimeout(() => setIsGenerating(false), 3000); // Mock generation
    };

    return (
        <main className="min-h-screen bg-cinematic-900 text-white flex flex-col">
            <Navbar />

            <div className="flex-1 pt-16 flex flex-col md:flex-row">
                {/* Left Panel: The Studio / Canvas */}
                <div className="w-full md:w-1/2 p-6 md:p-12 border-r border-white/10 flex flex-col items-center justify-center bg-cinematic-900 relative">
                    <div className="absolute top-6 left-6 text-brand-neon font-bold tracking-wider flex items-center gap-2">
                        <Camera className="w-5 h-5" />
                        <span>AI STUDIO V1.0</span>
                    </div>

                    {/* Upload/Preview Zone */}
                    <div className="w-full max-w-md aspect-3/4 bg-white/5 rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center relative overflow-hidden group hover:border-brand-neon/50 transition-colors">
                        {isGenerating ? (
                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
                                <Sparkles className="w-12 h-12 text-brand-neon animate-spin mb-4" />
                                <p className="text-brand-neon font-mono animate-pulse">GENERATING FIT...</p>
                            </div>
                        ) : (
                            <>
                                <div className="p-8 rounded-full bg-white/10 mb-4 group-hover:bg-brand-neon/20 transition-colors">
                                    <Upload className="w-8 h-8 text-gray-400 group-hover:text-brand-neon" />
                                </div>
                                <p className="text-gray-400 font-medium">Upload your full-body photo</p>
                                <p className="text-xs text-gray-500 mt-2">Recommended: Well lit, simple background</p>
                            </>
                        )}
                    </div>
                </div>

                {/* Right Panel: Wardrobe */}
                <div className="w-full md:w-1/2 bg-cinematic-800 p-6 md:p-12 overflow-y-auto h-[calc(100vh-64px)]">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-2">Select Item</h1>
                        <p className="text-gray-400">Choose a piece from our collection to try on.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {PRODUCTS.slice(0, 4).map((product) => (
                            <div
                                key={product.id}
                                onClick={() => setSelectedProduct(product.id)}
                                className={cn(
                                    "relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all",
                                    selectedProduct === product.id ? "border-brand-neon" : "border-transparent opacity-60 hover:opacity-100"
                                )}
                            >
                                <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                                <div className="absolute bottom-0 left-0 right-0 p-2 bg-linear-to-t from-black/80 to-transparent">
                                    <p className="text-xs font-bold truncate">{product.name}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Action Bar */}
                    <div className="mt-8 sticky bottom-0 p-4 bg-cinematic-800/90 backdrop-blur border-t border-white/10 -mx-6 -mb-6">
                        <button
                            disabled={!selectedProduct || isGenerating}
                            onClick={handleGenerate}
                            className="w-full py-4 bg-brand-neon text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <Shirt className="w-5 h-5" />
                            {isGenerating ? "Processing..." : "Generate Try-On"}
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
