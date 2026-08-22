"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const InitialLoader = () => {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (sessionStorage.getItem("potata-visit") === "true") {
            return;
        }

        const showTimer = setTimeout(() => {
            sessionStorage.setItem("potata-visit", "true");
            setIsLoading(true);
        }, 0);

        return () => clearTimeout(showTimer);
    }, []);

    useEffect(() => {
        if (!isLoading) {
            return;
        }

        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 3500);

        return () => clearTimeout(timer);
    }, [isLoading]);

    return (
        <AnimatePresence mode="wait">
            {isLoading && (
                <motion.div
                    className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-black overflow-hidden"
                    initial={{ y: 0 }}
                    exit={{
                        y: "-100%",
                        transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } // Custom bezier for premium feel
                    }}
                >
                    {/* Animated Text Container */}
                    <div className="relative overflow-hidden mb-4">
                        <motion.h1
                            className="text-6xl md:text-9xl font-black text-white tracking-tighter italic font-outfit"
                            initial="hidden"
                            animate="visible"
                        >
                            {["P", "O", "T", "A", "T", "A"].map((char, index) => (
                                <motion.span
                                    key={index}
                                    className="inline-block origin-bottom"
                                    variants={{
                                        hidden: {
                                            y: 100,
                                            opacity: 0,
                                            filter: "blur(20px)",
                                            scale: 1.5,
                                        },
                                        visible: {
                                            y: 0,
                                            opacity: 1,
                                            filter: "blur(0px)",
                                            scale: 1,
                                            transition: {
                                                duration: 1.2,
                                                ease: [0.22, 1, 0.36, 1],
                                                delay: index * 0.1, // Stagger effect
                                            }
                                        }
                                    }}
                                >
                                    {char}
                                </motion.span>
                            ))}
                        </motion.h1>
                    </div>

                    {/* Optional: Subtle Progress or Tagline */}
                    <motion.div
                        className="text-zinc-400 text-sm tracking-[0.3em] uppercase"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { delay: 1.5, duration: 1 } }}
                    >
                        Seoul to Dubai
                    </motion.div>

                </motion.div>
            )}
        </AnimatePresence>
    );
};
