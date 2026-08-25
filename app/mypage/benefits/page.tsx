import { BenefitsClient } from "@/components/benefits/BenefitsClient";

export default function BenefitsPage() {
  return <main className="min-h-screen bg-black px-5 pb-24 pt-28 text-white"><div className="mx-auto max-w-3xl"><h1 className="text-3xl font-black">Benefits</h1><p className="mb-8 mt-2 text-zinc-400">관리자가 발급한 쿠폰과 포인트 기록을 확인합니다.</p><BenefitsClient /></div></main>;
}
