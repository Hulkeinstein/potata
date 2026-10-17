"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShoppingBag, Package, ArrowLeft } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { formatPrice } from "@/lib/utils";
import type { CreateOrderRequest } from "@/types";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getCommerceMessages } from "@/lib/i18n/commerce-messages";

export default function CheckoutPage() {
    const { locale } = useLanguage();
    const text = getCommerceMessages(locale);
    const router = useRouter();
    const { items, clearCart } = useCartStore();

    // skipHydration 대응: 수동 rehydrate 트리거 — 완료 여부는 store의 onRehydrateStorage가 판단
    const hasHydrated = useCartStore((s) => s.hasHydrated);
    useEffect(() => {
        useCartStore.persist.rehydrate();
    }, []);

    // 멱등성 키 — 페이지 진입 시 1회 생성
    const idempotencyKey = useRef<string>(crypto.randomUUID());

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<'orderError' | 'networkError' | null>(null);

    // hydration 완료 전 스켈레톤
    if (!hasHydrated) {
        return (
            <div className="min-h-screen bg-black pt-20 pb-24 text-white">
                <div className="max-w-2xl mx-auto px-6 space-y-4 animate-pulse">
                    <div className="h-8 w-48 bg-zinc-800 rounded" />
                    <div className="h-40 bg-zinc-900 rounded-xl" />
                    <div className="h-40 bg-zinc-900 rounded-xl" />
                </div>
            </div>
        );
    }

    const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    const shipping = subtotal > 50000 ? 0 : 3000;
    const total = subtotal + shipping;

    const handleOrder = async () => {
        if (items.length === 0 || isSubmitting) return;

        setIsSubmitting(true);
        setErrorMessage(null);

        const payload: CreateOrderRequest = {
            items: items.map((i) => ({
                productId: i.product.id,
                quantity: i.quantity,
                size: i.size,
                color: i.color,
            })),
            idempotencyKey: idempotencyKey.current,
        };

        try {
            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.status === 401) {
                router.push("/login?callbackUrl=/checkout");
                return;
            }

            const data = await res.json();

            if (res.ok && data.success) {
                clearCart();
                // 서버 장바구니도 비움 — 재로그인/다른 기기에서 주문 완료한 cart가 되살아나지 않게
                void fetch("/api/cart", {
                    method: "PUT",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ items: [] }),
                }).catch(() => {});
                router.push("/mypage/orders");
                return;
            }

            setErrorMessage('orderError');
        } catch {
            setErrorMessage('networkError');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-black pt-20 pb-24 text-white">
            <div className="max-w-2xl mx-auto px-6">

                {/* 헤더 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 mb-10"
                >
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
                        aria-label={text.back}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <ShoppingBag className="w-6 h-6 text-brand-neon" />
                        <h1 className="text-2xl font-bold font-outfit">{text.review}</h1>
                    </div>
                </motion.div>

                {/* 빈 카트 */}
                {items.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center text-center py-24 space-y-6"
                    >
                        <ShoppingBag className="w-20 h-20 text-zinc-700" />
                        <div className="space-y-2">
                            <p className="text-xl font-bold text-zinc-300">{text.empty}</p>
                            <p className="text-sm text-zinc-500">{text.emptyHint}</p>
                        </div>
                        <div className="flex gap-4">
                            <Link
                                href="/"
                                className="px-6 py-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors font-medium text-sm"
                            >
                                {text.home}
                            </Link>
                            <Link
                                href="/shop"
                                className="px-6 py-3 bg-linear-to-r from-brand-neon to-purple-500 text-black rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                            >
                                {text.start}
                            </Link>
                        </div>
                    </motion.div>
                ) : (
                    <>
                        {/* 상품 목록 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 }}
                            className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden mb-6"
                        >
                            <div className="p-4 border-b border-white/5">
                                <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{text.products}</h2>
                            </div>
                            <div className="divide-y divide-white/5">
                                {items.map((item) => (
                                    <div
                                        key={`${item.product.id}-${item.color ?? "default"}-${item.size ?? "default"}`}
                                        className="flex gap-4 p-4"
                                    >
                                        {/* 이미지 */}
                                        <div className="relative w-16 h-20 shrink-0 bg-zinc-800 rounded-md overflow-hidden">
                                            <Image
                                                src={item.product.imageUrl}
                                                alt={item.product.name}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>

                                        {/* 정보 */}
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                                                    {item.product.brand}
                                                </p>
                                                <p className="text-sm font-bold text-white line-clamp-2 mt-0.5">
                                                    {item.product.name}
                                                </p>
                                                {(item.color || item.size) && (
                                                    <p className="text-xs text-zinc-400 mt-1">
                                                        {[item.color, item.size].filter(Boolean).join(" / ")}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <p className="text-sm font-bold text-brand-neon">
                                                    {formatPrice(item.product.price)}
                                                </p>
                                                <p className="text-xs text-zinc-400">
                                                    {text.quantity} {item.quantity}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* 결제 요약 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-zinc-900/50 border border-white/5 rounded-xl p-6 mb-6"
                        >
                            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">{text.summary}</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm text-zinc-300">
                                    <span>{text.subtotal}</span>
                                    <span>{formatPrice(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-zinc-300">
                                    <span>{text.shipping}</span>
                                    <span>{shipping === 0 ? text.free : formatPrice(shipping)}</span>
                                </div>
                                {shipping > 0 && (
                                    <p className="text-xs text-zinc-500">
                                        {text.shippingHint}
                                    </p>
                                )}
                                <div className="flex justify-between text-base font-bold text-white pt-3 border-t border-white/5">
                                    <span>{text.total}</span>
                                    <span className="text-brand-neon">{formatPrice(total)}</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* 에러 메시지 */}
                        {errorMessage && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-red-400 text-sm text-center bg-red-400/10 rounded-lg px-4 py-3 mb-4"
                            >
                                {text[errorMessage]}
                            </motion.p>
                        )}

                        {/* 주문하기 버튼 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                        >
                            <button
                                onClick={handleOrder}
                                disabled={isSubmitting || items.length === 0}
                                className="w-full py-4 bg-linear-to-r from-brand-neon to-purple-500 text-black font-bold text-lg rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Package className="w-5 h-5" />
                                {isSubmitting ? text.submitting : text.submit}
                            </button>
                            <p className="text-xs text-zinc-500 text-center mt-3">
                                {text.pendingNotice}
                            </p>
                        </motion.div>
                    </>
                )}

            </div>
        </div>
    );
}
