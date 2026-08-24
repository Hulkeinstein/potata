import Link from "next/link";

export function Footer() {
    return (
        <footer className="bg-black text-white py-12 border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8">
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

            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-white/10 text-center text-xs text-gray-400">
                © 2024 POTATA. All rights reserved.
            </div>
        </footer>
    );
}
