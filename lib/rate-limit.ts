/**
 * 공용 rate limit — 같은 키의 호출을 시간창 안에서 제한한다.
 *
 * NOTE: 프로세스 메모리 기반이라 인스턴스가 여러 개면 "인스턴스당" 한도가 된다.
 *       무제한 대입을 늦추는 1차 방어선이며, 엄격한 한도가 필요하면 공유 저장소(DB)로 옮겨야 한다.
 */

const buckets = new Map<string, number[]>();
const MAX_TRACKED_KEYS = 10_000;

/** 호출을 1회 소비한다. 한도를 넘으면 false(소비하지 않음). */
export function consumeRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((at) => now - at < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return false;
  }
  buckets.set(key, [...recent, now]);
  if (buckets.size > MAX_TRACKED_KEYS) {
    for (const [tracked, times] of buckets) {
      if (times.every((at) => now - at >= windowMs)) buckets.delete(tracked);
    }
  }
  return true;
}

export function resetRateLimitsForTests(): void {
  buckets.clear();
}

/** 프록시 뒤에서의 호출자 IP. 알 수 없으면 "unknown"(공유 버킷으로 묶인다). */
export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",", 1)[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
