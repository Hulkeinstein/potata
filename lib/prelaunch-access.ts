type ExistingAccount = {
  readonly email: string;
  readonly emailVerified: boolean;
};

export function isPrelaunchOnboardingUser(user: ExistingAccount | null): boolean {
  const configuredEmail = process.env.PRELAUNCH_ONBOARDING_EMAIL?.trim().toLowerCase();
  return Boolean(
    configuredEmail && /^[^\s,@]+@[^\s,@]+\.[^\s,@]+$/.test(configuredEmail) &&
    user?.emailVerified && user.email.toLowerCase() === configuredEmail
  );
}
