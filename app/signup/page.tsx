"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { EmailSignupForm } from "@/components/signup/EmailSignupForm";
import { ProviderChooser } from "@/components/signup/ProviderChooser";
export default function SignupPage() {
  const [emailMode, setEmailMode] = useState(false);
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black"><Image src="https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=2073&auto=format&fit=crop" alt="" fill className="object-cover opacity-35" priority /><div className="absolute inset-0 bg-black/55" /><section className="relative z-10 mx-4 w-full max-w-md p-8"><header className="mb-10 text-center"><h1 className="font-outfit text-5xl font-black tracking-tighter text-white">POTATA</h1><p className="mt-2 text-sm uppercase tracking-widest text-zinc-400">Seoul to Dubai</p></header><div className="rounded-2xl border border-white/10 bg-black/55 p-6 shadow-2xl backdrop-blur-xl">{emailMode ? <EmailSignupForm onClose={() => setEmailMode(false)} /> : <ProviderChooser onEmail={() => setEmailMode(true)} />}<Link href="/login" className="mt-5 block text-center text-xs text-zinc-400 underline">이미 계정이 있으신가요? 로그인</Link></div><Link href="/" className="mt-8 block text-center text-sm text-zinc-400 hover:text-brand-neon">로그인 없이 둘러보기</Link></section></main>;
}
