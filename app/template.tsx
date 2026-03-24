"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <>
            <motion.div
                className="fixed inset-0 z-50 bg-black pointer-events-none"
                initial={{ y: "0%" }}
                animate={{ y: "-100%" }}
                transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }} // Premium ease
            />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
            >
                {children}
            </motion.div>
        </>
    );
}
