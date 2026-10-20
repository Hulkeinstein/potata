"use client";

export default function AdminError({ reset }: { readonly error: Error & { readonly digest?: string }; readonly reset: () => void }) {
  return <section role="alert" className="mx-auto my-10 max-w-xl rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-white">
    <h1 className="text-xl font-bold">관리자 데이터를 불러오지 못했습니다.</h1>
    <p className="mt-2 text-sm leading-6 text-zinc-400">일시적으로 조회할 수 없습니다. 잠시 후 다시 시도해 주세요. 실제 현황을 확인하기 전까지 수치를 표시하지 않습니다.</p>
    <button type="button" onClick={reset} className="mt-5 rounded bg-brand-neon px-4 py-2.5 font-bold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-neon">다시 시도</button>
  </section>;
}
