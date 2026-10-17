import { ProfileOnboardingHeader } from "@/components/onboarding/ProfileOnboardingHeader";
import { ProfileOnboardingForm } from "@/components/onboarding/ProfileOnboardingForm";
import { parseSafeReturnTo } from "@/lib/onboarding";
export default async function ProfileOnboardingPage({ searchParams }: { readonly searchParams: Promise<{ readonly returnTo?: string }> }) { const params = await searchParams; return <main className="min-h-screen bg-black px-4 py-12 text-white"><div className="mx-auto max-w-2xl"><ProfileOnboardingHeader /><ProfileOnboardingForm returnTo={parseSafeReturnTo(params.returnTo)} /></div></main>; }
