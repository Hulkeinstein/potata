"use client";

import { useState } from "react";
import { ProductCard } from "@/components/ui/ProductCard";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import type { Product, ProductCategory } from "@/types";
import { useSearchParams } from "next/navigation";

interface ShopContentProps {
    products: Product[];
}

const PAGE_SIZE = 8;
const CATEGORY_SET = new Set<string>(CATEGORIES);

function isProductCategory(value: string | null): value is ProductCategory {
    return value !== null && CATEGORY_SET.has(value);
}

export function ShopContent({ products }: ShopContentProps) {
    const searchParams = useSearchParams();
    const initialCategory = searchParams.get("category");
    const [selectedCategory, setSelectedCategory] = useState<ProductCategory>(
        isProductCategory(initialCategory) ? initialCategory : "All"
    );
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    const filteredProducts =
        selectedCategory === "All"
            ? products
            : products.filter((p) => p.category === selectedCategory);

    const visibleProducts = filteredProducts.slice(0, visibleCount);
    const hasMore = visibleCount < filteredProducts.length;

    const handleLoadMore = () => {
        setVisibleCount((prev) => prev + PAGE_SIZE);
    };

    return (
        <div className="min-h-screen bg-black pb-20 pt-16 text-white">
            {/* Filter Bar (Sticky) */}
            <div className="sticky top-16 z-40 bg-black/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
                    <div
                        className="flex items-center gap-4 overflow-x-auto no-scrollbar"
                        role="tablist"
                        aria-label="Product categories"
                    >
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                role="tab"
                                aria-selected={selectedCategory === cat}
                                className={cn(
                                    "text-sm px-3 py-1 rounded-full whitespace-nowrap transition-colors focus:outline-none",
                                    selectedCategory === cat
                                        ? "bg-white text-black font-bold"
                                        : "text-gray-400 hover:text-white"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <p className="text-sm font-medium text-gray-400">
                        Sort by: <span className="text-white">Newest</span>
                    </p>
                </div>
            </div>

            {/* Product Grid */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                <h1 className="text-xl font-bold mb-6 flex items-baseline gap-2">
                    {selectedCategory === "All" ? "All Products" : selectedCategory}
                    <span className="text-gray-400 text-sm font-normal">
                        ({filteredProducts.length})
                    </span>
                </h1>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
                    {visibleProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>

                {/* Load More */}
                {hasMore && (
                    <div className="py-12 flex justify-center">
                        <button
                            onClick={handleLoadMore}
                            className="px-8 py-3 border border-white/20 rounded-full font-bold hover:bg-white hover:text-black transition-colors"
                        >
                            Load More
                        </button>
                    </div>
                )}

                {/* Empty State */}
                {filteredProducts.length === 0 && (
                    <div className="py-20 text-center">
                        <p className="text-gray-400 font-medium">
                            No products found in this category.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
