"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useWishlistStore } from "@/store/wishlist-store";
import type { ApiResponse, WishlistGetData } from "@/types";

/**
 * 로그인/로그아웃 시 클라이언트 store를 서버 DB와 동기화하는 전역 컴포넌트.
 * AuthProvider(SessionProvider) 내부에 1곳만 마운트한다(페이지별 분산 금지 — race 방지).
 *
 * - 로그인: `/api/wishlist` GET → store에 로드(useRef 1회 가드, 매 렌더 재요청 방지).
 * - 로그아웃: store + localStorage 클리어 → 다음 계정/게스트에 이전 좋아요 잔존 방지(보안).
 *
 * 렌더 출력 없음(null). cart 동기화는 PR2에서 이 컴포넌트에 통합한다.
 */
export function StoreSync() {
    const { status } = useSession();
    const loadFromServer = useWishlistStore((s) => s.loadFromServer);
    const loadedRef = useRef(false);

    useEffect(() => {
        if (status === "authenticated" && !loadedRef.current) {
            loadedRef.current = true;
            (async () => {
                try {
                    const res = await fetch("/api/wishlist");
                    if (!res.ok) {
                        loadedRef.current = false; // 재시도 허용
                        return;
                    }
                    const json = (await res.json()) as ApiResponse<WishlistGetData>;
                    if (json.success && json.data) {
                        loadFromServer(json.data.productIds);
                    }
                } catch {
                    loadedRef.current = false; // 네트워크 실패 — 조용히, 재시도 허용
                }
            })();
        } else if (status === "unauthenticated") {
            // 로그아웃: 다음 사용자에게 잔존하지 않게 클리어
            loadFromServer([]);
            try {
                localStorage.removeItem("wishlist-storage");
            } catch {
                // localStorage 불가 환경 — 무시
            }
            loadedRef.current = false; // 다음 로그인 시 재로드 허용
        }
    }, [status, loadFromServer]);

    return null;
}
