"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useWishlistStore } from "@/store/wishlist-store";
import { useAuthStore } from "@/store/auth-store";
import { motion } from "framer-motion";
import { useState } from "react";

interface HeartButtonProps {
    productId: string;
    className?: string;
    iconSize?: number;
}

export function HeartButton({ productId, className, iconSize = 20 }: HeartButtonProps) {
    const router = useRouter();
    const { isLoggedIn } = useAuthStore();
    const { hasItem, toggleItem } = useWishlistStore();
    const isLiked = hasItem(productId);
    const [showToast, setShowToast] = useState(false);

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

        toggleItem(productId);
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
