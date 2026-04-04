import Link from "next/link";
import { Instagram, Twitter } from "lucide-react";

function TikTokIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
        </svg>
    );
}

export function Footer() {
    return (
        <footer className="bg-black text-white py-12 border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                    <h3 className="text-xl font-bold mb-4">POTATA</h3>
                    <p className="text-gray-400 text-sm">
                        Linking Seoul&apos;s vibrancy to Dubai&apos;s modern style.<br />
                        Premium K-Fashion &amp; AI experience.
                    </p>
                </div>

                <div>
                    <h4 className="font-bold mb-4">Shop</h4>
                    <ul className="space-y-2 text-sm text-gray-400">
                        <li><Link href="/shop" className="hover:text-white">New Arrivals</Link></li>
                        <li><Link href="/ranking" className="hover:text-white">Best Sellers</Link></li>
                        <li><Link href="/category" className="hover:text-white">Modest Wear</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold mb-4">Support</h4>
                    <ul className="space-y-2 text-sm text-gray-400">
                        <li><a href="#" className="hover:text-white">FAQ</a></li>
                        <li><a href="#" className="hover:text-white">Shipping (UAE)</a></li>
                        <li><a href="#" className="hover:text-white">Returns</a></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold mb-4">Stay Connected</h4>
                    <div className="flex gap-4">
                        <a href="#" className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors" aria-label="Instagram">
                            <Instagram className="w-4 h-4" />
                        </a>
                        <a href="#" className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors" aria-label="Twitter">
                            <Twitter className="w-4 h-4" />
                        </a>
                        <a href="#" className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors" aria-label="TikTok">
                            <TikTokIcon className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-white/10 text-center text-xs text-gray-400">
                © 2024 POTATA. All rights reserved.
            </div>
        </footer>
    );
}
