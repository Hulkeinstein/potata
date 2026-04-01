"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Package, Ticket, Coins, ChevronRight, Settings,
    Heart, FileText, Bell, LogOut
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

// Mock Data
const MY_STATS = [
    { label: "Delivery", value: "0", icon: Package, href: "/orders" },
    { label: "Coupons", value: "3", icon: Ticket, href: "/coupons" },
    { label: "Points", value: "1,200P", icon: Coins, href: "/points" },
];

const MY_MENU = [
    { label: "Order History", icon: FileText, href: "/orders" },
    { label: "Wishlist", icon: Heart, href: "/wishlist" },
    { label: "Notifications", icon: Bell, href: "/notifications" },
    { label: "Settings", icon: Settings, href: "/settings" },
];

export default function MyPage() {
    const { user, isLoggedIn, logout } = useAuthStore();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        if (!isLoggedIn) {
            router.push("/login"); // Redirect if not logged in
        }
    }, [isLoggedIn, router]);

    if (!isClient || !user) {
        return <div className="min-h-screen bg-black" />; // Loading state
    }

    return (
        <div className="min-h-screen bg-black pt-20 pb-24 text-white">
            <div className="max-w-2xl mx-auto px-6">

                {/* Profile Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-6 mb-10"
                >
                    <div className="relative w-24 h-24 rounded-full p-[2px] bg-linear-to-r from-brand-neon to-purple-500">
                        <div className="relative w-full h-full rounded-full overflow-hidden bg-black border-2 border-black">
                            <Image
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                                alt={user.name}
                                fill
                                className="object-cover"
                            />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold font-outfit mb-1">
                            Hello, <span className="text-brand-neon">{user.name}</span>
                        </h1>
                        <div className="flex items-center gap-2 text-zinc-400 text-sm">
                            <span className="px-2 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-xs">
                                VIP Member
                            </span>
                            <span>{user.name.toLowerCase().replace(/\s+/g, '.')}@potata.com</span>
                        </div>
                    </div>
                </motion.div>

                {/* Dashboard Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-3 gap-4 mb-10"
                >
                    {MY_STATS.map((stat) => (
                        <Link
                            key={stat.label}
                            href={stat.href}
                            className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-zinc-900 transition-colors group"
                        >
                            <stat.icon className="w-6 h-6 text-zinc-400 group-hover:text-brand-neon transition-colors" />
                            <div className="text-center">
                                <span className="block text-xl font-bold font-outfit text-white group-hover:text-brand-neon transition-colors">
                                    {stat.value}
                                </span>
                                <span className="text-xs text-zinc-400">{stat.label}</span>
                            </div>
                        </Link>
                    ))}
                </motion.div>

                {/* Menu List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-2 mb-10"
                >
                    {MY_MENU.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="w-full flex items-center justify-between p-4 bg-zinc-900/30 border border-white/5 rounded-lg hover:bg-white/5 transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400 group-hover:text-white transition-colors">
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <span className="font-medium text-zinc-300 group-hover:text-white transition-colors">
                                    {item.label}
                                </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                        </Link>
                    ))}
                </motion.div>

                {/* Logout Button */}
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    onClick={() => { logout(); router.push("/"); }}
                    className="w-full py-4 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </motion.button>

            </div>
        </div>
    );
}
