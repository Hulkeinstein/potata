"use client";

import { useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, ShoppingBag, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/cart-store";

export function CartDrawer() {
    const { items, isOpen, closeCart, updateQuantity, removeItem } = useCartStore();

    // Prevent body scroll when cart is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [isOpen]);

    const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    const shipping = subtotal > 50000 ? 0 : 3000;
    const total = subtotal + shipping;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeCart}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-zinc-900 border-l border-white/10 z-[70] flex flex-col shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5 text-brand-neon" />
                                <h2 className="text-lg font-bold text-white">Shopping Bag</h2>
                                <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full text-zinc-400">
                                    {items.length}
                                </span>
                            </div>
                            <button
                                onClick={closeCart}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Items List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {items.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-60">
                                    <ShoppingBag className="w-16 h-16 text-zinc-700" />
                                    <p className="text-zinc-500 font-medium">Your bag is empty.</p>
                                    <button
                                        onClick={closeCart}
                                        className="text-brand-neon hover:text-white transition-colors text-sm font-bold"
                                    >
                                        Start Shopping
                                    </button>
                                </div>
                            ) : (
                                items.map((item) => (
                                    <div key={`${item.product.id}-${item.color ?? "default"}-${item.size ?? "default"}`} className="flex gap-4">
                                        {/* Image */}
                                        <div className="relative w-20 h-24 flex-shrink-0 bg-zinc-800 rounded-md overflow-hidden">
                                            <Image
                                                src={item.product.imageUrl}
                                                alt={item.product.name}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <h3 className="text-sm font-bold text-white line-clamp-2">{item.product.name}</h3>
                                                    <button
                                                        onClick={() => removeItem(item)}
                                                        className="text-zinc-600 hover:text-red-400 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {(item.color || item.size) && (
                                                    <p className="text-xs text-zinc-500 mt-1">
                                                        {[item.color, item.size].filter(Boolean).join(" / ")}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between mt-2">
                                                <p className="text-sm font-bold text-brand-neon">
                                                    ₩{item.product.price.toLocaleString()}
                                                </p>

                                                {/* Quantity */}
                                                <div className="flex items-center gap-3 bg-white/5 rounded-full px-2 py-1">
                                                    <button
                                                        onClick={() => updateQuantity(item, -1)}
                                                        className="p-1 hover:text-white text-zinc-500 transition-colors"
                                                        disabled={item.quantity <= 1}
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <span className="text-xs font-medium w-4 text-center text-white">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item, 1)}
                                                        className="p-1 hover:text-white text-zinc-500 transition-colors"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {items.length > 0 && (
                            <div className="p-6 border-t border-white/5 bg-zinc-900/95 backdrop-blur-sm">
                                <div className="space-y-2 mb-6">
                                    <div className="flex justify-between text-sm text-zinc-400">
                                        <span>Subtotal</span>
                                        <span>₩{subtotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-zinc-400">
                                        <span>Shipping</span>
                                        <span>{shipping === 0 ? "Free" : `₩${shipping.toLocaleString()}`}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-white/5">
                                        <span>Total</span>
                                        <span>₩{total.toLocaleString()}</span>
                                    </div>
                                </div>

                                <button className="w-full py-4 bg-gradient-to-r from-brand-neon to-purple-500 text-black font-bold text-lg rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                                    Checkout <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
