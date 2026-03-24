"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function CustomCursor() {
    const [isVisible, setIsVisible] = useState(false);
    const [isHovering, setIsHovering] = useState(false);

    // Mouse position values
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Smooth spring physics for the cursor
    const springConfig = { damping: 25, stiffness: 700 };
    const cursorX = useSpring(mouseX, springConfig);
    const cursorY = useSpring(mouseY, springConfig);

    useEffect(() => {
        // Only show custom cursor on devices with fine pointers (mouse)
        const mediaQuery = window.matchMedia("(pointer: fine)");
        if (!mediaQuery.matches) return;

        setIsVisible(true);

        const moveCursor = (e: MouseEvent) => {
            mouseX.set(e.clientX - 16); // Center the 32px cursor
            mouseY.set(e.clientY - 16);
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Check if hovering over clickable elements
            if (
                target.tagName === "BUTTON" ||
                target.tagName === "A" ||
                target.getAttribute("role") === "button" ||
                target.closest("button") ||
                target.closest("a")
            ) {
                setIsHovering(true);
            } else {
                setIsHovering(false);
            }
        };

        window.addEventListener("mousemove", moveCursor);
        window.addEventListener("mouseover", handleMouseOver);

        return () => {
            window.removeEventListener("mousemove", moveCursor);
            window.removeEventListener("mouseover", handleMouseOver);
        };
    }, [mouseX, mouseY]);

    if (!isVisible) return null;

    return (
        <motion.div
            className="fixed top-0 left-0 w-8 h-8 pointer-events-none z-[9999] mix-blend-difference" // Interaction on top
            style={{
                x: cursorX,
                y: cursorY,
            }}
        >
            {/* Outer Ring */}
            <motion.div
                layoutId="cursor-ring"
                className="absolute inset-0 rounded-full opacity-80"
                style={{
                    borderColor: '#ccf381', // Brand Neon
                }}
                animate={{
                    scale: isHovering ? 1.5 : 1,
                    opacity: isHovering ? 1 : 0.8,
                    borderWidth: isHovering ? "2px" : "1px",
                    backgroundColor: isHovering ? "rgba(204, 243, 129, 0.1)" : "transparent", // Subtle fill on hover
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />

            {/* Inner Dot */}
            <motion.div
                layoutId="cursor-dot"
                className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2"
                style={{ backgroundColor: '#ccf381' }} // Brand Neon
                animate={{
                    scale: isHovering ? 0 : 1,
                }}
            />
        </motion.div>
    );
}
