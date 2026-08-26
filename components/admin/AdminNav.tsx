import Link from "next/link";

const ITEMS = [
  { href: "/admin", label: "Home" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/benefits", label: "Benefits" },
] as const;

export function AdminNav() {
  return <nav aria-label="관리자 메뉴" className="border-b border-zinc-800 bg-zinc-950 px-4 py-3 text-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2"><Link href="/admin" className="font-black text-brand-neon">POTATA OPS</Link>{ITEMS.map((item) => <Link key={item.href} href={item.href} className="text-sm text-zinc-300 hover:text-white">{item.label}</Link>)}</div></nav>;
}
