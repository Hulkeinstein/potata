"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
    variant?: "default" | "card" | "circle";
}

export function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
    return (
        <div
            className={cn(
                "relative overflow-hidden bg-zinc-900/50 backdrop-blur-sm", // Base dark layer
                variant === "circle" ? "rounded-full" : "rounded-xl",
                className
            )}
            {...props}
        >
            {/* Neon Shimmer Effect */}
            <motion.div
                className="absolute inset-0 z-10"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "linear",
                    repeatDelay: 0.5
                }}
                style={{
                    background: `
            linear-gradient(
              90deg,
              transparent 0%,
              rgba(204, 243, 129, 0.05) 40%, /* Brand Neon #ccf381 with very low opacity */
              rgba(204, 243, 129, 0.1) 50%,  /* Peak intensity */
              rgba(204, 243, 129, 0.05) 60%,
              transparent 100%
            )
          `
                }}
            />

            {/* Subtle Pulse for breathing effect */}
            <motion.div
                className="absolute inset-0 bg-white/5"
                animate={{ opacity: [0, 0.1, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
        </div>
    );
}
