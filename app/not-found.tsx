import Link from "next/link";
import { Home, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 텍스트 */}
        <div className="mb-8">
          <h1 className="text-8xl font-black text-gray-100 select-none">404</h1>
          <div className="relative -mt-12">
            <h2 className="text-2xl font-bold text-gray-900">
              Page Not Found
            </h2>
          </div>
        </div>

        {/* 메시지 */}
        <p className="text-gray-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>

        {/* 액션 버튼 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black text-white font-bold rounded-full hover:bg-gray-800 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 font-bold rounded-full hover:bg-gray-50 transition-colors"
          >
            <Search className="w-4 h-4" />
            Browse Shop
          </Link>
        </div>

        {/* 추가 링크 */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <p className="text-sm text-gray-400 mb-4">Popular Destinations</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { href: "/shop", label: "Shop" },
              { href: "/brands", label: "Brands" },
              { href: "/ranking", label: "Ranking" },
              { href: "/try-on", label: "AI Studio" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-400 hover:text-black px-3 py-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
