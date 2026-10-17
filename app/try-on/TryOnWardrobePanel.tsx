"use client";
import Image from "next/image";
import { useState } from "react";
import { Shirt, History, Grid, Clock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { categoryLabel } from "@/lib/i18n/discovery-messages";
import { studioMessages } from "@/lib/i18n/studio-messages";
import type { Product, ProductCategory } from "@/types";
import type { GeneratedImage } from "@/store/studio-store";
type Tab = "wardrobe" | "gallery" | "recents";
type Props = {
 readonly products: Product[]; readonly activeTab: Tab; readonly setActiveTab: (value: Tab) => void;
 readonly selectedCategory: ProductCategory; readonly setSelectedCategory: (value: ProductCategory) => void;
 readonly selectedProduct: string | null; readonly setSelectedProduct: (value: string) => void;
 readonly gallery: GeneratedImage[]; readonly recents: string[]; readonly setGeneratedImage: (value: string | null) => void;
 readonly removeFromGallery: (value: string) => void; readonly userImage: string | null; readonly isGenerating: boolean; readonly handleGenerate: () => void;
};
export function TryOnWardrobePanel({ products, activeTab, setActiveTab, selectedCategory, setSelectedCategory, selectedProduct, setSelectedProduct, gallery, recents, setGeneratedImage, removeFromGallery, userImage, isGenerating, handleGenerate }: Props) {
 const { locale } = useLanguage();
 const t = studioMessages[locale];
 return (
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
                            {t.wardrobe}
                        </button>
                        <button
                            onClick={() => setActiveTab("gallery")}
                            className={cn(
                                "rgb-tab px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors",
                                activeTab === "gallery" ? "border-purple-500 text-white" : "border-transparent text-gray-400 hover:text-white"
                            )}
                        >
                            <Grid className="w-4 h-4" />
                            {t.gallery}
                        </button>
                        <button
                            onClick={() => setActiveTab("recents")}
                            className={cn(
                                "rgb-tab px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors",
                                activeTab === "recents" ? "border-purple-500 text-white" : "border-transparent text-gray-400 hover:text-white"
                            )}
                        >
                            <History className="w-4 h-4" />
                            {t.recents}
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-12 scrollbar-hide">

                        {/* WARDROBE TAB */}
                        {activeTab === "wardrobe" && (
                            <>
                                <div className="mb-6">
                                    <h1 className="text-3xl font-bold mb-2">{t.select}</h1>
                                    <p className="text-gray-400">{t.choose}</p>
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
                                            {categoryLabel(cat, locale)}
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
                                    <h1 className="text-3xl font-bold mb-2">{t.myGallery}</h1>
                                    <p className="text-gray-400">{t.galleryNote}</p>
                                </div>

                                {gallery.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                        <Grid className="w-12 h-12 mb-4 opacity-50" />
                                        <p>{t.emptyGallery}</p>
                                        <button onClick={() => setActiveTab("wardrobe")} className="mt-4 text-purple-400 font-bold hover:underline">
                                            {t.create}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 pb-24">
                                        {gallery.map((img) => (
                                            <div key={img.id} className="group relative aspect-3/4 rounded-xl overflow-hidden border border-white/10 bg-zinc-900">
                                                <Image src={img.imageUrl} alt={t.generated} fill className="object-cover" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <button
                                                        aria-label={t.viewImage}
                                                        onClick={() => setGeneratedImage(img.imageUrl)}
                                                        className="p-2 bg-white text-black rounded-full hover:bg-purple-500 hover:text-white transition-colors"
                                                    >
                                                        <Grid className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        aria-label={t.deleteImage}
                                                        onClick={() => removeFromGallery(img.id)}
                                                        className="p-2 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs text-gray-300">
                                                    {new Date(img.createdAt).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-GB')}
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
                                    <h1 className="text-3xl font-bold mb-2">{t.recentOutfits}</h1>
                                    <p className="text-gray-400">{t.recentNote}</p>
                                </div>

                                {recents.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                        <Clock className="w-12 h-12 mb-4 opacity-50" />
                                        <p>{t.emptyRecent}</p>
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
                                {isGenerating ? t.processing : t.generate}

                            </button>
                        </div>
                    )}
                </div>
 );
}
// Sub-component for Product Card with Loading State
function ProductCard({
    product,
    selectedProduct,
    setSelectedProduct,
}: { readonly product: Product; readonly selectedProduct: string | null; readonly setSelectedProduct: (productId: string) => void }) {
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
