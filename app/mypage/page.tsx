"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { signOut, useSession } from "next-auth/react";
import {
    ChevronRight,
    Heart, FileText, Bell, LogOut, Images
} from "lucide-react";

const MY_MENU = [
    { label: "Order History", icon: FileText, href: "/mypage/orders" },
    { label: "My Posts", description: "OOTD · Reviews · Q&A 관리", icon: Images, href: "/mypage/posts" },
    { label: "Wishlist", icon: Heart, href: "/liked" },
    { label: "Notifications", icon: Bell, href: "/notifications" },
];

export default function MyPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const user = session?.user;

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/login");
        }
    }, [router, status]);

    if (status !== "authenticated" || !user) {
        return <div className="min-h-screen bg-black" />;
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
                            <span>{user.email}</span>
                        </div>
                    </div>
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
                                <div>
                                    <span className="font-medium text-zinc-300 group-hover:text-white transition-colors">
                                        {item.label}
                                    </span>
                                    {item.description && <span className="block text-xs text-zinc-500">{item.description}</span>}
                                </div>
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
                    onClick={async () => {
                        await signOut({ redirect: false });
                        router.push("/");
                        router.refresh();
                    }}
                    className="w-full py-4 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </motion.button>

            </div>
        </div>
    );
}
