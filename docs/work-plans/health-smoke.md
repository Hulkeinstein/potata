# 상태 확인 API · 배포 smoke 점검 스크립트

> 상태: 완료(2026-10-14) · 승인 · 작성 2026-10-14 · 브랜치 `feat/health-smoke` · 로드맵 9번 "배포 smoke test", 11번 "운영 관찰성"

## Objective

배포된 사이트가 정상인지 한 줄 명령으로 확인하고, 외부 uptime 모니터가 DB 연결까지 볼 수 있는 상태 확인 주소를 만든다.

## Evidence

- 상태 확인 route 없음(`app/api/` 에 health 없음). 배포 smoke 는 로드맵에서 "배포 후" 수동 절차로만 정의돼 있다.
- middleware matcher 는 `/mypage` `/liked` `/notifications` `/admin` 만 본다 → `/api/health` 는 로그인 없이 열린다.
- 보안 헤더 5종은 `next.config.ts` 가 모든 응답에 붙인다(테스트 존재).
- 오류 모니터링 서비스(Sentry 등)는 미도입. 도입하려면 외부 계정 + 의존성 추가(🟡 Ask First)가 필요하다 → 이 계획에서는 제외하고 별도 결정으로 둔다.

## 설계

1. **`GET /api/health`** — DB 에 `SELECT 1` 을 보낸다.
   - 성공: `200 { ok: true, db: "ok" }`
   - 실패: `503 { ok: false, db: "error" }`. 오류 내용은 응답에 싣지 않고 서버 로그에만 남긴다.
   - 캐시하지 않는다(`dynamic = "force-dynamic"`, `Cache-Control: no-store`). 인증·개인정보·환경값을 응답에 넣지 않는다.
2. **`npm run smoke -- <BASE_URL>`** (`scripts/smoke.ts` 한 파일, 의존성 없음, 읽기 전용 GET 만). 구현 중 `.mjs` 두 파일 대신 TypeScript 한 파일로 바꿨다 — Node 22 가 type stripping 으로 바로 실행하고(추가 의존성 0), 타입 검사와 테스트 import 를 그대로 쓸 수 있다:
   | 점검 | 기대 |
   |---|---|
   | `/` | 200 + 보안 헤더 5종 |
   | `/shop` | 200 |
   | `/api/health` | 200 · `ok: true` |
   | `/api/auth/providers` | 200 · google·credentials 포함 |
   | `/api/cart` (비로그인) | 401 |
   | `/admin`, `/mypage` (비로그인) | 로그인 화면으로 redirect |

   항목별 PASS/FAIL 표를 출력하고, 하나라도 실패하면 exit 1 로 끝난다. 데이터를 쓰거나 로그인하지 않는다.
3. 점검 목록은 `scripts/smoke.ts` 의 `CHECKS` 한 곳에 두고, 단위 테스트는 가짜 fetch 로 판정 로직만 검증한다.

## Success Criteria

1. `/api/health` 가 DB 정상 시 200, DB 오류 시 503 이고, 응답 본문에 오류 내용이 없다 — 확인: 단위 테스트
2. smoke 스크립트가 로컬 production 서버에서 전 항목 PASS, 일부러 틀린 주소에서 FAIL·exit 1 — 확인: 직접 실행
3. tsc·lint 0 errors · 전체 테스트 통과 — 확인: 직접 실행

## Tasks

- T1 `app/api/health/route.ts` + 테스트 · 약 50줄 · low
- T2 `scripts/smoke.ts` + 테스트 · `package.json` scripts 1줄 · 약 120줄 · low
- T3 로드맵 9·11번과 README/운영 문서에 사용법 1단락

## 결정 필요

- 로컬 production 서버 실행(`npm run build && npm start`)으로 smoke 를 확인한다 — 로컬 개발 DB 가 필요하므로 Docker 기동 승인 필요(검증 단계에서 다시 확인).
- 오류 모니터링(Sentry) 도입 여부 — 외부 계정·의존성이 필요해 이번 범위에서 뺐다.

## 검증 기록 (2026-10-14)

- 단위 테스트 11건(상태 확인 2 · smoke 판정 9) · tsc 0 errors.
- 로컬 production 서버(`next build` + `next start`, 임시 postgres:16 컨테이너, 테스트용 env)에서 `npm run smoke -- http://localhost:3100` → 7/7 PASS, exit 0.
- 실패 확인: 없는 주소 → 7/7 FAIL, exit 1 · DB 컨테이너 중지 → 상태 확인만 FAIL(503, 본문 `{"ok":false,"db":"error"}`, `no-store`), exit 1.
- 이 checkout 에는 `.env*` 가 `.env.example` 뿐이라 개발 DB 대신 임시 컨테이너로 확인했다. 서버·컨테이너·Docker 는 확인 후 모두 종료했다.
- 참고: DB 를 멈춰도 `/shop` 은 200(정적 생성) — 그래서 DB 상태는 `/api/health` 로만 판단한다.
