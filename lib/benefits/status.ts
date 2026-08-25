export type CouponStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

export function couponGrantStatus(_grant: { readonly revokedAt: Date | null; readonly expiresAt: Date | null }, _now: Date): CouponStatus {
  if (_grant.revokedAt) return "REVOKED";
  if (_grant.expiresAt && _grant.expiresAt.getTime() <= _now.getTime()) return "EXPIRED";
  return "ACTIVE";
}

export function sumPointBalance(entries: readonly { readonly amount: number }[]): number {
  return entries.reduce((balance, entry) => balance + entry.amount, 0);
}
