/**
 * admin 권한 판정 헬퍼 — **서버 전용**.
 *
 * 왜 env allowlist 방식인가:
 *   - DB에 role 필드를 추가하면 스키마 변경 + 마이그레이션이 필요하지만,
 *     초기 관리자는 운영자 1~2명이라 env allowlist가 충분히 단순하고 안전하다.
 *   - `ADMIN_EMAILS`는 서버 env에만 존재해야 하며 `NEXT_PUBLIC_` 금지.
 *
 * 닫힘(false) 기본값 정책:
 *   - env가 비어 있거나 누락이면 아무도 admin이 아님.
 *   - "열려 있다가 실수로 허용"보다 "닫혀 있다가 명시적 허용"이 안전하다.
 *
 * Lazy 로드 이유:
 *   - 모듈 최상위에서 env를 캐시하면 Vitest에서 env 주입 후 호출이 불가능해진다.
 *   - `getAdminEmails()`를 호출 시점마다 읽어 테스트 격리를 보장한다.
 */

import { normalizeEmail } from "@/lib/normalize";

/**
 * `ADMIN_EMAILS` env(콤마 구분)를 **호출 시점**에 읽어 정규화한 admin 이메일 Set 반환.
 * 모듈 로드 시 평가·캐시하지 않음 — 테스트에서 env 주입 후 즉시 반영 가능.
 */
function getAdminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => normalizeEmail(e))
      .filter((e) => e.length > 0)
  );
}

/**
 * 주어진 이메일이 admin allowlist에 있으면 true.
 * email이 없거나 env가 미설정이면 false(닫힘 기본값).
 */
export function isAdmin(email?: string | null): boolean {
  return !!email && getAdminEmails().has(normalizeEmail(email));
}
