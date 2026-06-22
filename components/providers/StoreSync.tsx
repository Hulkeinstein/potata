"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useWishlistStore } from "@/store/wishlist-store";
import { useCartStore } from "@/store/cart-store";
import type { ApiResponse, WishlistGetData, CartGetData, CartSyncLine } from "@/types";

/**
 * 로그인/로그아웃 시 클라이언트 store(wishlist·cart)를 서버 DB와 동기화하는 전역 컴포넌트.
 * AuthProvider(SessionProvider) 내부에 1곳만 마운트(페이지별 분산 금지 — race 방지).
 *
 * - 로그인: 각 store를 서버 값으로 1회 로드(useRef 가드).
 * - 로그아웃: store + localStorage 클리어 → 다음 계정에 이전 데이터 잔존 방지(보안).
 * - cart 변경: 디바운스 PUT(전체 동기화, fire-and-forget). 초기 로드/rehydrate는
 *   `cartSyncEnabledRef`로 막아 echo PUT을 방지.
 */
export function StoreSync() {
    const { status } = useSession();
    const loadWishlist = useWishlistStore((s) => s.loadFromServer);
    const loadCart = useCartStore((s) => s.loadFromServer);

    const wlLoadedRef = useRef(false);
    const cartLoadedRef = useRef(false);
    const cartSyncEnabledRef = useRef(false); // 초기 로드 완료 후에만 PUT 허용(echo 방지)

    // 로그인/로그아웃 → 초기 로드 / 클리어
    useEffect(() => {
        if (status === "authenticated") {
            // wishlist 로드(1회)
            if (!wlLoadedRef.current) {
                wlLoadedRef.current = true;
                (async () => {
                    try {
                        const res = await fetch("/api/wishlist");
                        if (!res.ok) {
                            wlLoadedRef.current = false;
                            return;
                        }
                        const json = (await res.json()) as ApiResponse<WishlistGetData>;
                        if (json.success && json.data) loadWishlist(json.data.productIds);
                    } catch {
                        wlLoadedRef.current = false;
                    }
                })();
            }
            // cart 로드(1회): 로컬 rehydrate → 서버 GET으로 덮어씀 → 동기화 활성화
            if (!cartLoadedRef.current) {
                cartLoadedRef.current = true;
                useCartStore.persist.rehydrate(); // skipHydration 대응(로컬 먼저)
                (async () => {
                    try {
                        const res = await fetch("/api/cart");
                        if (res.ok) {
                            const json = (await res.json()) as ApiResponse<CartGetData>;
                            if (json.success && json.data) loadCart(json.data.items);
                        }
                    } catch {
                        // 네트워크 실패 — 로컬 유지(조용히)
                    } finally {
                        // 로드(및 rehydrate) 완료 후에만 사용자 변경을 서버에 PUT
                        cartSyncEnabledRef.current = true;
                    }
                })();
            }
        } else if (status === "unauthenticated") {
            // 로그아웃: 다음 사용자에게 잔존하지 않게 클리어
            loadWishlist([]);
            loadCart([]);
            try {
                localStorage.removeItem("wishlist-storage");
                localStorage.removeItem("cart-storage");
            } catch {
                // localStorage 불가 환경 — 무시
            }
            wlLoadedRef.current = false;
            cartLoadedRef.current = false;
            cartSyncEnabledRef.current = false;
        }
    }, [status, loadWishlist, loadCart]);

    // cart 변경 → 디바운스 PUT(전체 동기화). 로그인 + 초기 로드 완료 시에만.
    useEffect(() => {
        if (status !== "authenticated") return;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const unsub = useCartStore.subscribe((state, prev) => {
            if (state.items === prev.items) return; // items 변경만 반응
            if (!cartSyncEnabledRef.current) return; // 초기 로드/rehydrate echo 방지
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                const lines: CartSyncLine[] = useCartStore.getState().items.map((i) => ({
                    productId: i.product.id,
                    size: i.size ?? "",
                    color: i.color ?? "",
                    quantity: i.quantity,
                }));
                void fetch("/api/cart", {
                    method: "PUT",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ items: lines }),
                }).catch((err) => console.warn("[StoreSync] cart 동기화 실패:", err));
            }, 600);
        });

        return () => {
            if (timer) clearTimeout(timer);
            unsub();
        };
    }, [status]);

    return null;
}
