"use client";

import { Upload, Sparkles, Shirt, Camera, History, Grid, Clock, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import { useStudioStore } from "@/store/studio-store";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Product, ProductCategory } from "@/types";
import { useSearchParams } from "next/navigation";

type Tab = "wardrobe" | "gallery" | "recents";

type GeneratedTryOnResponse = {
    output?: string;
    error?: string;
};

interface SelectableProductCardProps {
    product: Product;
    selectedProduct: string | null;
    setSelectedProduct: (productId: string) => void;
}

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
                alert("Image processing failed.");
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
            setErrorLog("선택한 상품 정보를 찾을 수 없습니다.");
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
                setErrorLog(errMsg);
            }
        } catch (error) {
            console.error(error);
            setErrorLog("Network or Server Error. Check console.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <main className="min-h-screen bg-black text-white flex flex-col pt-16">
            <div className="flex-1 flex flex-col md:flex-row">
                {/* Left Panel: The Studio / Canvas */}
                <div className="w-full md:w-1/2 p-6 md:p-12 border-r border-white/5 flex flex-col items-center justify-center bg-black relative">
                    <div className="absolute top-6 left-6 text-purple-400 font-bold tracking-wider flex items-center gap-2">
                        <Camera className="w-5 h-5" />
                        <span>AI STUDIO V1.0</span>

                    </div>

                    {errorLog && (
                        <div className="absolute top-16 left-6 right-6 bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl z-50 backdrop-blur">
                            <p className="font-bold text-sm">⛔ Error</p>
                            <p className="text-xs mt-1">{errorLog}</p>
                        </div>
                    )}

                    {/* Result View */}
                    {generatedImage ? (
                        <div className="w-full max-w-md aspect-3/4 relative rounded-2xl overflow-hidden shadow-[0_0_50px_-10px_rgba(168,85,247,0.5)] border border-purple-500/50">
                            <Image src={generatedImage} alt="Generated Fit" fill className="object-cover" />
                            <div className="absolute bottom-4 right-4 flex gap-2">
                                <button
                                    onClick={() => setGeneratedImage(null)}
                                    className="px-4 py-2 bg-black/60 backdrop-blur text-white rounded-full text-sm font-bold border border-white/20 hover:bg-white hover:text-black transition-colors"
                                >
                                    Try Another
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Body Profile Inputs (Optional - currently just visual) */}
                            <div className="w-full max-w-md grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-white/5 border border-white/10 rounded-xl p-3 focus-within:border-purple-500 transition-colors">
                                    <label className="text-xs text-gray-400 block mb-1">Height (cm)</label>
                                    <input type="number" placeholder="170" className="w-full bg-transparent text-white font-bold outline-none placeholder-gray-600" />
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-xl p-3 focus-within:border-purple-500 transition-colors">
                                    <label className="text-xs text-gray-400 block mb-1">Weight (kg)</label>
                                    <input type="number" placeholder="60" className="w-full bg-transparent text-white font-bold outline-none placeholder-gray-600" />
                                </div>
                            </div>

                            {/* Upload/Preview Zone */}
                            <div className="w-full max-w-md aspect-[3/4] relative group cursor-pointer rounded-2xl overflow-hidden bg-zinc-900 shadow-[0_0_40px_-10px_rgba(168,85,247,0.3)]">
                                {/* Rotating Gradient Layers */}
                                <div className="absolute -inset-full bg-[conic-gradient(from_90deg_at_50%_50%,#0000_50%,#a855f7_100%)] animate-[spin_10s_linear_infinite]" />
                                <div className="absolute -inset-full bg-[conic-gradient(from_270deg_at_50%_50%,#0000_50%,#ccf381_100%)] animate-[spin_10s_linear_infinite]" />

                                {/* Content Container */}
                                <div className="absolute inset-[2px] bg-zinc-950 rounded-[14px] flex flex-col items-center justify-center overflow-hidden z-10">
                                    {userImage ? (
                                        <Image src={userImage} alt="User Upload" fill className="object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                                    ) : null}

                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                                    />

                                    {isGenerating ? (
                                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                                            <Sparkles className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                                            <p className="text-purple-400 font-mono animate-pulse">GENERATING FIT...</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center pointer-events-none z-40 transition-opacity">
                                            <div className="p-8 rounded-full bg-white/5 mb-4 group-hover:bg-purple-500/20 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all duration-300">
                                                <Upload className="w-8 h-8 text-gray-400 group-hover:text-purple-400 transition-colors" />
                                            </div>
                                            <p className="text-gray-400 font-medium group-hover:text-purple-200 transition-colors">
                                                {userImage ? "Change Photo" : "Upload Full Body Photo"}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-2 group-hover:text-gray-400">Recommended: Well lit, simple background</p>
                                        </div>
                                    )}


                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Right Panel: Tabs & Wardrobe */}
                <div className="w-full md:w-1/2 bg-zinc-950 flex flex-col h-[calc(100vh-64px)]">

                    {/* Tabs */}
                    <div className="flex items-center border-b border-white/5 px-6 pt-6">
                        <button
                            onClick={() => setActiveTab("wardrobe")}
                            className={cn(
                                "rgb-tab px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors",
                                activeTab === "wardrobe" ? "border-purple-500 text-white" : "border-transparent text-gray-400 hover:text-white"
                            )}
                        >
                            <Shirt className="w-4 h-4" />
                            Wardrobe
                        </button>
                        <button
                            onClick={() => setActiveTab("gallery")}
                            className={cn(
                                "rgb-tab px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors",
                                activeTab === "gallery" ? "border-purple-500 text-white" : "border-transparent text-gray-400 hover:text-white"
                            )}
                        >
                            <Grid className="w-4 h-4" />
                            Gallery
                        </button>
                        <button
                            onClick={() => setActiveTab("recents")}
                            className={cn(
                                "rgb-tab px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors",
                                activeTab === "recents" ? "border-purple-500 text-white" : "border-transparent text-gray-400 hover:text-white"
                            )}
                        >
                            <History className="w-4 h-4" />
                            Recents
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-12 scrollbar-hide">

                        {/* WARDROBE TAB */}
                        {activeTab === "wardrobe" && (
                            <>
                                <div className="mb-6">
                                    <h1 className="text-3xl font-bold mb-2">Select Item</h1>
                                    <p className="text-gray-400">Choose a piece from our collection to try on.</p>
                                </div>

                                {/* Category Tabs */}
                                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-6 pb-2">
                                    {CATEGORIES.map((cat) => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={cn(
                                                "px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border",
                                                selectedCategory === cat
                                                    ? "bg-white text-black border-white"
                                                    : "bg-transparent text-gray-400 border-zinc-800 hover:text-white hover:border-zinc-600"
                                            )}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-4 pb-24">
                                    {products.filter((p) => selectedCategory === "All" || p.category === selectedCategory).map((product) => (
                                        <ProductCard key={product.id} product={product} selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} />
                                    ))}
                                </div>
                            </>
                        )}

                        {/* GALLERY TAB */}
                        {activeTab === "gallery" && (
                            <>
                                <div className="mb-6">
                                    <h1 className="text-3xl font-bold mb-2">My Gallery</h1>
                                    <p className="text-gray-400">Your generated AI looks.</p>
                                </div>

                                {gallery.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                        <Grid className="w-12 h-12 mb-4 opacity-50" />
                                        <p>No generated images yet.</p>
                                        <button onClick={() => setActiveTab("wardrobe")} className="mt-4 text-purple-400 font-bold hover:underline">
                                            Start Creating
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 pb-24">
                                        {gallery.map((img) => (
                                            <div key={img.id} className="group relative aspect-3/4 rounded-xl overflow-hidden border border-white/10 bg-zinc-900">
                                                <Image src={img.imageUrl} alt="Generated" fill className="object-cover" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setGeneratedImage(img.imageUrl)}
                                                        className="p-2 bg-white text-black rounded-full hover:bg-purple-500 hover:text-white transition-colors"
                                                    >
                                                        <Grid className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => removeFromGallery(img.id)}
                                                        className="p-2 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs text-gray-300">
                                                    {new Date(img.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {/* RECENTS TAB */}
                        {activeTab === "recents" && (
                            <>
                                <div className="mb-6">
                                    <h1 className="text-3xl font-bold mb-2">Recent Outfits</h1>
                                    <p className="text-gray-400">Items you recently tried on.</p>
                                </div>

                                {recents.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                        <Clock className="w-12 h-12 mb-4 opacity-50" />
                                        <p>No recent items found.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 pb-24">
                                        {recents.map((id) => {
                                            // props 배열에서 최근 상품 조회 (PRODUCTS import 대신)
                                            const product = products.find(p => p.id === id);
                                            if (!product) return null;
                                            return (
                                                <div
                                                    key={product.id}
                                                    onClick={() => {
                                                        setSelectedProduct(product.id);
                                                        setActiveTab("wardrobe");
                                                    }}
                                                    className="relative aspect-square rounded-xl overflow-hidden cursor-pointer border border-white/10 opacity-80 hover:opacity-100 hover:border-purple-500 transition-all group"
                                                >
                                                    <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                                                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-black/90 to-transparent">
                                                        <p className="text-xs font-bold truncate text-white">{product.name}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Action Bar (Only visible in Wardrobe) */}
                    {activeTab === "wardrobe" && (
                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-zinc-950/90 backdrop-blur border-t border-white/5 md:w-1/2 md:left-auto">
                            <button
                                disabled={!selectedProduct || !userImage || isGenerating}
                                onClick={handleGenerate}
                                className="relative w-full py-4 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-purple-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <Shirt className="w-5 h-5" />
                                {isGenerating ? "Processing..." : "Generate Try-On"}

                            </button>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

// Sub-component for Product Card with Loading State
function ProductCard({
    product,
    selectedProduct,
    setSelectedProduct,
}: SelectableProductCardProps) {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div
            onClick={() => setSelectedProduct(product.id)}
            className={cn(
                "relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all group",
                selectedProduct === product.id ? "border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]" : "border-transparent block opacity-100" // Removed opacity-60 to handle loading state internally
            )}
        >
            {isLoading && <Skeleton className="absolute inset-0 z-10" />}
            <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className={cn(
                    "object-cover transition-opacity duration-500",
                    isLoading ? "opacity-0" : "opacity-60 group-hover:opacity-100"
                )}
                onLoad={() => setIsLoading(false)}
            />
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-black/90 to-transparent z-20">
                <p className="text-xs font-bold truncate text-white">{product.name}</p>
            </div>
        </div>
    );
}
