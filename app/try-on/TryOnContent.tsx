"use client";

import { Upload, Sparkles, Camera } from "lucide-react";
import Image from "next/image";
import { useState } from "react";


import { useStudioStore } from "@/store/studio-store";
import { TryOnWardrobePanel } from "./TryOnWardrobePanel";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { studioError, studioMessages } from "@/lib/i18n/studio-messages";
import type { Product, ProductCategory } from "@/types";
import { useSearchParams } from "next/navigation";

type Tab = "wardrobe" | "gallery" | "recents";

type GeneratedTryOnResponse = {
    output?: string;
    error?: string;
};

interface TryOnContentProps {
    products: Product[];
}

function getTryOnCategory(category?: ProductCategory): string {
    switch (category) {
        case "Bottom":
            return "lower_body";
        case "Dress":
            return "dresses";
        default:
            return "upper_body";
    }
}

export function TryOnContent({ products }: TryOnContentProps) {
    const { locale } = useLanguage();
    const t = studioMessages[locale];
    const searchParams = useSearchParams();
    const initialProductId = searchParams.get("product");

    const [selectedCategory, setSelectedCategory] = useState<ProductCategory>("All");
    const [selectedProduct, setSelectedProduct] = useState<string | null>(initialProductId);
    const [userImage, setUserImage] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("wardrobe");

    const [errorLog, setErrorLog] = useState<string | null>(null);

    const { gallery, recents, addToGallery, addToRecents, removeFromGallery } = useStudioStore();

    // Utility: Resize image to max 1024px to prevent payload issues
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = document.createElement("img");
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const MAX_WIDTH = 1024;
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                    const ctx = canvas.getContext("2d");
                    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL("image/jpeg", 0.8));
                };
            };
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                setUserImage(compressed);
                setGeneratedImage(null);
                setErrorLog(null);
            } catch (err) {
                console.error("Compression Error:", err);
                alert(t.processingFailed);
            }
        }
    };

    const handleGenerate = async () => {
        if (!selectedProduct || !userImage) return;

        setIsGenerating(true);
        setErrorLog(null);

        // props 배열에서 상품 조회 (PRODUCTS import 대신)
        const product = products.find((p) => p.id === selectedProduct);
        if (!product) {
            setIsGenerating(false);
            setErrorLog(t.productMissing);
            return;
        }

        // Add to Recents (로컬 즉시 반영)
        addToRecents(product.id);
        // 로그인 사용자는 서버에도 저장 — fire-and-forget(실패해도 로컬 동작 유지)
        void fetch("/api/recents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: product.id }),
        }).catch(() => {});

        try {
            const response = await fetch("/api/try-on", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userImage,
                    productImage: product.imageUrl,
                    category: getTryOnCategory(product.category),
                    description: product.description,
                }),
            });

            const data = (await response.json()) as GeneratedTryOnResponse;
            if (response.ok && data.output) {
                setGeneratedImage(data.output);
                addToGallery(data.output, product.id);
            } else {
                const errMsg = data.error || "Unknown server error";
                console.error("API Error:", errMsg);
                setErrorLog(t.requestFailed);
            }
        } catch (error) {
            console.error(error);
            setErrorLog(t.network);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <main data-catalog-refresh-blocked={isGenerating ? 'true' : undefined} className="min-h-screen bg-black text-white flex flex-col pt-16">
            <div className="flex-1 flex flex-col md:flex-row">
                {/* Left Panel: The Studio / Canvas */}
                <div className="w-full md:w-1/2 p-6 md:p-12 border-r border-white/5 flex flex-col items-center justify-center bg-black relative">
                    <div className="absolute top-6 left-6 text-purple-400 font-bold tracking-wider flex items-center gap-2">
                        <Camera className="w-5 h-5" />
                        <span>{t.studio}</span>

                    </div>

                    {errorLog && (
                        <div className="absolute top-16 left-6 right-6 bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl z-50 backdrop-blur">
                            <p className="font-bold text-sm">{t.error}</p>
                            <p className="text-xs mt-1">{studioError(errorLog, locale)}</p>
                        </div>
                    )}

                    {/* Result View */}
                    {generatedImage ? (
                        <div className="w-full max-w-md aspect-3/4 relative rounded-2xl overflow-hidden shadow-[0_0_50px_-10px_rgba(168,85,247,0.5)] border border-purple-500/50">
                            <Image src={generatedImage} alt={t.generated} fill className="object-cover" />
                            <div className="absolute bottom-4 right-4 flex gap-2">
                                <button
                                    onClick={() => setGeneratedImage(null)}
                                    className="px-4 py-2 bg-black/60 backdrop-blur text-white rounded-full text-sm font-bold border border-white/20 hover:bg-white hover:text-black transition-colors"
                                >
                                    {t.tryAnother}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Upload/Preview Zone */}
                            <div className="w-full max-w-md aspect-[3/4] relative group cursor-pointer rounded-2xl overflow-hidden bg-zinc-900 shadow-[0_0_40px_-10px_rgba(168,85,247,0.3)]">
                                {/* Rotating Gradient Layers */}
                                <div className="absolute -inset-full bg-[conic-gradient(from_90deg_at_50%_50%,#0000_50%,#a855f7_100%)] animate-[spin_10s_linear_infinite]" />
                                <div className="absolute -inset-full bg-[conic-gradient(from_270deg_at_50%_50%,#0000_50%,#ccf381_100%)] animate-[spin_10s_linear_infinite]" />

                                {/* Content Container */}
                                <div className="absolute inset-[2px] bg-zinc-950 rounded-[14px] flex flex-col items-center justify-center overflow-hidden z-10">
                                    {userImage ? (
                                        <Image src={userImage} alt={t.uploaded} fill className="object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                                    ) : null}

                                    <input
                                        type="file"
                                        accept="image/*"
                                        aria-label={t.upload}
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                                    />

                                    {isGenerating ? (
                                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                                            <Sparkles className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                                            <p className="text-purple-400 font-mono animate-pulse">{t.generating}</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center pointer-events-none z-40 transition-opacity">
                                            <div className="p-8 rounded-full bg-white/5 mb-4 group-hover:bg-purple-500/20 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all duration-300">
                                                <Upload className="w-8 h-8 text-gray-400 group-hover:text-purple-400 transition-colors" />
                                            </div>
                                            <p className="text-gray-400 font-medium group-hover:text-purple-200 transition-colors">
                                                {userImage ? t.change : t.upload}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-2 group-hover:text-gray-400">{t.photoHint}</p>
                                        </div>
                                    )}


                                </div>
                            </div>
                        </>
                    )}
                </div>

                <TryOnWardrobePanel products={products} activeTab={activeTab} setActiveTab={setActiveTab} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} gallery={gallery} recents={recents} setGeneratedImage={setGeneratedImage} removeFromGallery={removeFromGallery} userImage={userImage} isGenerating={isGenerating} handleGenerate={handleGenerate} />
            </div>
        </main>
    );
}
