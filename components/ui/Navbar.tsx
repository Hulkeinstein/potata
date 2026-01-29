"use client";

import Link from "next/link";
import { ShoppingBag, Menu, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { motion } from "framer-motion";

export function Navbar() {
    const { isLoggedIn, login, logout } = useAuthStore();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-background/80 backdrop-blur-md border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="text-2xl font-bold tracking-tighter hover:opacity-80 transition-opacity">
                        POTATA
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link href="/shop" className="text-sm font-medium hover:text-brand-neon transition-colors">
                            SHOP
                        </Link>
                        <Link href="/about" className="text-sm font-medium hover:text-brand-neon transition-colors">
                            ABOUT
                        </Link>
                        <Link href="/try-on" className="group flex items-center space-x-1 text-sm font-medium text-brand-neon hover:opacity-80 transition-opacity">
                            <Sparkles className="w-4 h-4" />
                            <span>AI STUDIO</span>
                        </Link>
                    </div>

                    {/* Icons / Auth */}
                    <div className="flex items-center space-x-4">
                        {/* Auth Toggle (Mock) */}
                        <button
                            onClick={isLoggedIn ? logout : login}
                            className={cn(
                                "text-xs px-3 py-1 rounded-full border transition-all",
                                isLoggedIn
                                    ? "border-brand-neon text-brand-neon hover:bg-brand-neon/10"
                                    : "border-gray-500 text-gray-400 hover:border-white hover:text-white"
                            )}
                        >
                            {isLoggedIn ? "Guest Mode" : "Login"} (Dev)
                        </button>

                        <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
                            <User className="w-5 h-5" />
                        </button>
                        <button className="p-2 hover:bg-white/5 rounded-full transition-colors relative">
                            <ShoppingBag className="w-5 h-5" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-brand-neon rounded-full"></span>
                        </button>
                        <button className="md:hidden p-2 hover:bg-white/5 rounded-full transition-colors">
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
