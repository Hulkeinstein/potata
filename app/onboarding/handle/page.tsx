import { redirect } from "next/navigation";
import { parseSafeReturnTo } from "@/lib/onboarding";
export default async function LegacyHandleOnboarding({ searchParams }: { readonly searchParams: Promise<{ readonly returnTo?: string }> }) { const params = await searchParams; redirect(`/onboarding/profile?returnTo=${encodeURIComponent(parseSafeReturnTo(params.returnTo ?? "/what-to-wear"))}`); }
