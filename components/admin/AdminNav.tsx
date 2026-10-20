"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "운영 홈", number: "01" },
  { href: "/admin/products", label: "상품 관리", number: "02" },
  { href: "/admin/inventory", label: "재고 운영", number: "03" },
  { href: "/admin/questions", label: "고객 문의", number: "04" },
  { href: "/admin/benefits", label: "쿠폰·포인트", number: "05" },
  { href: "/admin/operations", label: "운영 이슈", number: "06" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return <nav aria-label="관리자 메뉴" className="flex flex-wrap gap-2 lg:flex-col">
    {ITEMS.map((item) => {
      const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
      return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-md border px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-neon ${active ? "border-zinc-700 bg-zinc-800 text-white" : "border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white"}`}>
        <span aria-hidden="true" className={`text-xs tabular-nums ${active ? "text-brand-neon" : "text-zinc-600"}`}>{item.number}</span>{item.label}
      </Link>;
    })}
  </nav>;
}
