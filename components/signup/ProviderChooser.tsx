"use client";
import { Mail } from "lucide-react";
import { signIn } from "next-auth/react";
export function ProviderChooser({ onEmail }: { readonly onEmail: () => void }) {
  return <div className="space-y-3"><p className="mb-6 text-center text-sm text-zinc-400">계정을 만든 뒤 프로필과 약관을 한 번에 설정합니다.</p><button type="button" onClick={() => signIn("google", { callbackUrl: "/onboarding/profile" }, { prompt: "select_account" })} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white font-bold text-black"><span className="text-lg">G</span> Google로 계속하기</button><button type="button" disabled title="준비중입니다" className="flex h-12 w-full cursor-not-allowed items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 font-bold text-white/50">Apple로 계속하기 (준비중)</button><div className="mt-6 border-t border-white/10 pt-4"><button type="button" onClick={onEmail} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/5 bg-zinc-800/50 font-medium text-zinc-300"><Mail className="h-4 w-4" /> 이메일로 회원가입</button></div></div>;
}
