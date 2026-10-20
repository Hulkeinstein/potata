import Link from "next/link";
import type { ReactNode } from "react";
import { AdminNav } from "./AdminNav";

export function AdminShell({ children }: { readonly children: ReactNode }) {
  return <div className="min-h-screen bg-black text-white lg:grid lg:grid-cols-[14rem_minmax(0,1fr)]">
    <a href="#admin-content" className="sr-only z-50 rounded bg-brand-neon px-4 py-3 font-bold text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4">관리자 본문으로 건너뛰기</a>
    <aside className="border-b border-zinc-800 bg-zinc-950 p-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-r lg:border-b-0 lg:p-5">
      <Link href="/admin" className="inline-block rounded py-2 text-lg font-black tracking-tight focus-visible:outline-2 focus-visible:outline-brand-neon">POTATA <span className="text-brand-neon">OPS</span></Link>
      <p className="mb-5 mt-1 text-xs text-zinc-500">운영자 전용 작업 공간</p>
      <AdminNav />
      <p className="mt-6 hidden border-t border-zinc-800 pt-4 text-xs leading-5 text-zinc-500 lg:block">상품과 재고, 고객 응대를<br />한 곳에서 관리합니다.</p>
    </aside>
    <div className="min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/70 px-4 py-4 lg:px-8">
        <p className="text-xs font-semibold tracking-wide text-zinc-400">관리자 영역</p>
        <Link href="/" className="rounded border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-neon">고객 사이트 보기 ↗</Link>
      </header>
      <div id="admin-content" tabIndex={-1} className="min-w-0 focus-visible:outline-2 focus-visible:outline-brand-neon">{children}</div>
    </div>
  </div>;
}
