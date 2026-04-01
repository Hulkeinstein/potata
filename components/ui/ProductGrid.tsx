"use client";

import { PRODUCTS } from "@/data/dummy";
import { ProductCard } from "./ProductCard";

export function ProductGrid() {
    return (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold tracking-tight text-white">New Arrivals</h2>
                <button className="text-sm font-medium text-gray-400 hover:text-white hover:underline transition-colors">View All</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
                {PRODUCTS.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
                {/* Duplicate for demo volume */}
                {PRODUCTS.map((product) => (
                    <ProductCard key={`${product.id}-copy`} product={{ ...product, id: `${product.id}-copy` }} />
                ))}
            </div>
        </section>
    );
}
