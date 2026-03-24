"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShoppingBag, Menu, User, Sparkles, X, Search, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { NAV_LINKS } from "@/lib/constants";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { useCartStore } from "@/store/cart-store";

export function Navbar() {
    const { isLoggedIn, login, logout } = useAuthStore();
    const router = useRouter();
    const { toggleCart, items: cartItems } = useCartStore();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    return (
        <>
            <nav
                className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-black/60 backdrop-blur-xl border-b border-white/5"
                role="navigation"
                aria-label="Main navigation"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link
                            href="/"
                            className="text-2xl font-black tracking-tighter text-white hover:text-purple-400 transition-colors uppercase"
                            aria-label="POTATA Home"
                        >
                            POTATA
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-8" role="menubar">
                            {NAV_LINKS.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="text-sm font-bold text-gray-400 hover:text-white transition-colors relative py-1"
                                    role="menuitem"
                                >
                                    {link.label}
                                </Link>
                            ))}
                            <Link
                                href="/try-on"
                                className="group flex items-center space-x-1 text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors scale-100 hover:scale-105 active:scale-95"
                                role="menuitem"
                            >
                                <Sparkles className="w-4 h-4" aria-hidden="true" />
                                <span className="text-glow">AI STUDIO</span>
                            </Link>
                        </div>

                        <div className="flex items-center space-x-2 sm:space-x-4">
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                            >
                                <Search className="w-5 h-5" />
                            </button>

                            <Link
                                href="/liked"
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                aria-label="Wishlist"
                            >
                                <div className="relative">
                                    <Heart className="w-5 h-5" />
                                </div>
                            </Link>

                            <button
                                onClick={() => isLoggedIn ? logout() : router.push("/login")}
                                className={cn(
                                    "text-[10px] font-bold px-2 py-1 rounded-full border transition-all hidden sm:block",
                                    isLoggedIn
                                        ? "border-purple-500 text-purple-400"
                                        : "border-gray-600 text-gray-400 hover:text-white hover:border-white"
                                )}
                                aria-label={isLoggedIn ? "Logout" : "Login"}
                            >
                                {isLoggedIn ? "Guest" : "Login"}
                            </button>

                            <Link
                                href={isLoggedIn ? "/mypage" : "/login"}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                aria-label="User profile"
                            >
                                <User className="w-5 h-5" aria-hidden="true" />
                            </Link>

                            <button
                                onClick={toggleCart}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors relative"
                                aria-label="Shopping cart with items"
                            >
                                <ShoppingBag className="w-5 h-5" aria-hidden="true" />
                                {cartItems.length > 0 && (
                                    <span
                                        className="absolute top-1 right-1 w-1.5 h-1.5 bg-brand-neon shadow-[0_0_5px_rgba(204,243,129,0.5)] rounded-full"
                                        aria-hidden="true"
                                    />
                                )}
                            </button>

                            {/* Mobile Menu Toggle */}
                            <button
                                className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                onClick={toggleMobileMenu}
                                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                                aria-expanded={isMobileMenuOpen}
                                aria-controls="mobile-menu"
                            >
                                {isMobileMenuOpen ? (
                                    <X className="w-5 h-5" aria-hidden="true" />
                                ) : (
                                    <Menu className="w-5 h-5" aria-hidden="true" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </nav >

            <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
            <CartDrawer />

            {/* Mobile Menu Overlay */}
            {
                isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={closeMobileMenu}
                        aria-hidden="true"
                    />
                )
            }

            {/* Mobile Menu Panel */}
            <div
                id="mobile-menu"
                className={cn(
                    "fixed top-16 left-0 right-0 bg-white z-40 md:hidden transition-all duration-300 ease-in-out border-b border-gray-100 shadow-lg",
                    isMobileMenuOpen
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 -translate-y-4 pointer-events-none"
                )}
                role="menu"
                aria-label="Mobile navigation"
            >
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col space-y-1">
                        {NAV_LINKS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={closeMobileMenu}
                                className="text-sm font-bold py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-neon"
                                role="menuitem"
                            >
                                {link.label}
                            </Link>
                        ))}
                        <Link
                            href="/try-on"
                            onClick={closeMobileMenu}
                            className="flex items-center space-x-2 text-sm font-bold py-3 px-4 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-neon"
                            role="menuitem"
                        >
                            <Sparkles className="w-4 h-4" aria-hidden="true" />
                            <span>AI STUDIO</span>
                        </Link>
                    </div>

                    {/* Mobile Auth Button */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <button
                            onClick={() => {
                                isLoggedIn ? logout() : router.push("/login");
                                closeMobileMenu();
                            }}
                            className={cn(
                                "w-full py-3 rounded-lg font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-neon",
                                isLoggedIn
                                    ? "border border-brand-neon text-brand-neon"
                                    : "bg-gray-100 text-gray-700"
                            )}
                        >
                            {isLoggedIn ? "Logout" : "Login"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
