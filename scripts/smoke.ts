/**
 * 배포 smoke 점검 — 읽기 전용 GET 만 보낸다(로그인·쓰기 없음).
 * 사용: npm run smoke -- https://배포-주소   (또는 env SMOKE_BASE_URL)
 * Node 22 의 TypeScript 실행(type stripping)으로 바로 돈다 — 그래서 enum 같은 변환이 필요한 문법은 쓰지 않는다.
 * 계획: docs/work-plans/health-smoke.md
 */
import { pathToFileURL } from "node:url";

export type SmokeResult = { name: string; path: string; ok: boolean; detail: string };
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** next.config.ts 가 모든 응답에 붙이는 보안 헤더 */
const SECURITY_HEADERS = [
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "strict-transport-security",
];

/** 판정 함수: 통과면 null, 실패면 이유 문자열 */
type Check = { name: string; path: string; judge: (res: Response) => Promise<string | null> };

function statusIs(expected: number) {
  return async (res: Response) => (res.status === expected ? null : `status ${res.status} (기대 ${expected})`);
}

async function redirectsToLogin(res: Response): Promise<string | null> {
  const location = res.headers.get("location") ?? "";
  if (res.status < 300 || res.status >= 400) return `status ${res.status} (기대 3xx redirect)`;
  return location.includes("/login") ? null : `redirect 대상이 /login 이 아님: ${location || "(없음)"}`;
}

export const CHECKS: Check[] = [
  {
    name: "홈 200 + 보안 헤더",
    path: "/",
    judge: async (res) => {
      if (res.status !== 200) return `status ${res.status} (기대 200)`;
      const missing = SECURITY_HEADERS.filter((header) => !res.headers.get(header));
      return missing.length === 0 ? null : `보안 헤더 없음: ${missing.join(", ")}`;
    },
  },
  { name: "Shop 200", path: "/shop", judge: statusIs(200) },
  {
    name: "상태 확인(DB 포함)",
    path: "/api/health",
    judge: async (res) => {
      if (res.status !== 200) return `status ${res.status} (기대 200)`;
      const body = (await res.json()) as { ok?: unknown };
      return body.ok === true ? null : "ok !== true";
    },
  },
  {
    name: "로그인 공급자(Google·이메일)",
    path: "/api/auth/providers",
    judge: async (res) => {
      if (res.status !== 200) return `status ${res.status} (기대 200)`;
      const providers = Object.keys((await res.json()) as Record<string, unknown>);
      const missing = ["google", "credentials"].filter((id) => !providers.includes(id));
      return missing.length === 0 ? null : `공급자 없음: ${missing.join(", ")}`;
    },
  },
  { name: "장바구니 API 비로그인 차단", path: "/api/cart", judge: statusIs(401) },
  { name: "관리자 화면 비로그인 redirect", path: "/admin", judge: redirectsToLogin },
  { name: "마이페이지 비로그인 redirect", path: "/mypage", judge: redirectsToLogin },
];

export async function runSmoke(baseUrl: string, fetchImpl: FetchLike = fetch): Promise<SmokeResult[]> {
  const base = new URL(baseUrl);
  const results: SmokeResult[] = [];
  for (const check of CHECKS) {
    const url = new URL(check.path, base).toString();
    try {
      const res = await fetchImpl(url, { redirect: "manual", headers: { "user-agent": "potata-smoke" } });
      const reason = await check.judge(res);
      results.push({ name: check.name, path: check.path, ok: reason === null, detail: reason ?? `status ${res.status}` });
    } catch (error) {
      results.push({ name: check.name, path: check.path, ok: false, detail: `요청 실패: ${error instanceof Error ? error.message : String(error)}` });
    }
  }
  return results;
}

async function main(): Promise<number> {
  const baseUrl = process.argv[2] ?? process.env.SMOKE_BASE_URL;
  if (!baseUrl) {
    console.error("사용법: npm run smoke -- <배포 주소>   (예: npm run smoke -- http://localhost:3000)");
    return 2;
  }
  const results = await runSmoke(baseUrl);
  for (const result of results) {
    console.log(`${result.ok ? "PASS" : "FAIL"}  ${result.name.padEnd(24)} ${result.path.padEnd(22)} ${result.detail}`);
  }
  const failed = results.filter((result) => !result.ok).length;
  console.log(failed === 0 ? `\n전체 ${results.length}개 통과` : `\n${results.length}개 중 ${failed}개 실패`);
  return failed === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => process.exit(code));
}
