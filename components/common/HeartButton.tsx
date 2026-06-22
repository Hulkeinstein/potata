"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useWishlistStore } from "@/store/wishlist-store";
import { motion } from "framer-motion";

interface HeartButtonProps {
    productId: string;
    className?: string;
    iconSize?: number;
}

export function HeartButton({ productId, className, iconSize = 20 }: HeartButtonProps) {
    const router = useRouter();
    const { status } = useSession();
    const { hasItem, toggleItem } = useWishlistStore();
    const isLiked = hasItem(productId);
    const isLoggedIn = status === "authenticated";

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isLoggedIn) {
            // Show simple toast or alert, then redirect
            // Ideally we use a Toast component, but for now simple alert/log is fine or a custom minimal absolute overlay
            if (confirm("로그인이 필요한 서비스입니다. 로그인 페이지로 이동하시겠습니까?")) {
                router.push("/login");
            }
            return;
        }

        // 낙관적 토글 — UI 즉시 반영
        toggleItem(productId);
        // 백그라운드 저장(fire-and-forget) — 실패 시 조용히 롤백
        void fetch("/api/wishlist", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ productId }),
        })
            .then((res) => {
                if (!res.ok) throw new Error(`wishlist save failed: ${res.status}`);
            })
            .catch((err) => {
                console.warn("[HeartButton] 위시리스트 저장 실패, 롤백:", err);
                toggleItem(productId); // 원복
            });
    };

    return (
        <button
            onClick={handleClick}
            className={cn(
                "group relative p-2 rounded-full transition-all duration-300 hover:bg-white/10 active:scale-90",
                className
            )}
            aria-label={isLiked ? "Unlike" : "Like"}
        >
            <Heart
                size={iconSize}
                className={cn(
                    "transition-all duration-300",
                    isLiked
                        ? "fill-brand-neon text-brand-neon"
                        : "text-white group-hover:text-brand-neon"
                )}
            />
            {isLiked && (
                <motion.div
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 bg-brand-neon rounded-full -z-10"
                />
            )}
        </button>
    );
}
