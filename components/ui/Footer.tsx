export function Footer() {
    return (
        <footer className="bg-black text-white py-12 border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                    <h3 className="text-xl font-bold mb-4">POTATA</h3>
                    <p className="text-gray-400 text-sm">
                        Linking Seoul's vibrancy to Dubai's modernize.<br />
                        Premium K-Fashion & AI experience.
                    </p>
                </div>

                <div>
                    <h4 className="font-bold mb-4">Shop</h4>
                    <ul className="space-y-2 text-sm text-gray-400">
                        <li><a href="#" className="hover:text-white">New Arrivals</a></li>
                        <li><a href="#" className="hover:text-white">Best Sellers</a></li>
                        <li><a href="#" className="hover:text-white">Modest Wear</a></li>
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
                        {/* Social Icons Mock */}
                        <div className="w-8 h-8 bg-white/10 rounded-full"></div>
                        <div className="w-8 h-8 bg-white/10 rounded-full"></div>
                        <div className="w-8 h-8 bg-white/10 rounded-full"></div>
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-white/10 text-center text-xs text-gray-500">
                © 2024 POTATA. All rights reserved.
            </div>
        </footer>
    );
}
