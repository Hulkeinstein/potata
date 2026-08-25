import Link from "next/link";
import { UserSettingsForm } from "@/components/settings/UserSettingsForm";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-black pb-24 pt-20 text-white">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <Link href="/mypage" className="mb-4 inline-flex min-h-11 items-center text-sm text-zinc-400 hover:text-white">← 마이페이지</Link>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mb-8 mt-2 text-zinc-400">Potata에서 실제로 사용하는 로컬 계정 설정입니다.</p>
        <UserSettingsForm />
      </div>
    </main>
  );
}
