# Work Plan: BLF AX 워크플로우 도입 + P0 인증 버그 수정 (2-PR)

## Overview

> **⚠️ 2026-06-15 갱신: PR#2(Task 10~16, 인증 수정)는 취소.** P0 인증 버그가 origin/main(#11/#12/2c47833)에서 병렬로 이미 수정됨(signup bcrypt+upsert, verify upsert, verification-store 삭제). PR#1(Task 1~9, 인프라)은 origin/main에 rebase 완료. 상세: `.omo/notepads/blf-workflow-adoption/issues.md`.

- **Objective**: BLF AX의 검증 계층(테스트+CI)·원칙 SSoT(AGENTS.md)·연속성(session.md)을 potata 규모에 맞게 right-sized 도입하고, 이 안전망 위에서 P0 인증 배선 버그(verify가 `prisma.user.create()`를 호출하지 않아 모든 유저가 로그인 영구 실패)를 수정한다. 통합테스트 GREEN = 수정의 DoD.
- **Branch**:
  - PR#1: `feat/workflow-infra` (현 브랜치 `docs/workflow-adoption-report`에서 분기 또는 그 위에 적층)
  - PR#2: `fix/auth-user-creation`
- **Scope**:
  - **IN**:
    - PR#1 (인프라, CI green): vitest+RTL 셋업, `vitest.config.mts`, smoke 테스트 1개, 최소 CI 1-job, `AGENTS.md`, `CLAUDE.md`(@AGENTS.md import), 권한 allowlist, `docs/work-plans/roadmap.md`, ADR 3개, 경량 `.claude/rules/session.md`.
    - PR#2 (P0 수정 + 인증 테스트): `lib/verification-store.ts` async DB 전환, signup bcrypt+중복확인, verify `prisma.user.create`, resend async, 인증 단위테스트(Prisma mock), signup→verify→login 통합테스트(실 Postgres).
  - **OUT (명시적 과잉 — 도입 금지)**:
    - Redis verification store
    - e2e Playwright
    - 커버리지 게이트(coverage threshold)
    - CI 매트릭스(다중 node/OS)
    - ADR 4개 이상 (큰 결정 3개만)
    - 풀 BLF 세트: verify-*.ps1 적대 게이트, Docker multi-stage standalone, 멀티엔진(.cursor/.codex import), handoff hook 자동화, 16개 ADR
- **Tech Stack**: Next.js 16.1.6 + React 19.2.3, Tailwind4, Zustand, Framer Motion, Replicate, Resend, Supabase Postgres + Prisma 6.19.3 + NextAuth v5 beta30 (JWT) + bcryptjs. 테스트: Vitest + @testing-library/react + jsdom. CI: GitHub Actions + postgres:16 service container.

---

## Context

### Project Context (from docs/)
- **Product Goal**: potata = 한국→UAE 패션 커머스. 로그인은 핵심 사용자 플로우이며 현재 영구 고장 상태 → 복구가 최우선. 동시에 1인 개발 워크플로우를 BLF 검증 계층 핵심까지 성숙시킨다.
- **확정 기술결정 (DO NOT RE-DECIDE)**: Supabase+Prisma+NextAuth v5 JWT + bcrypt + Resend + Replicate, AED-only, 인메모리→DB verification store 전환. 이 결정들은 ADR로 소급 기록만 하고 재검토하지 않는다.
- **Aligned with Existing Plans**: 본 plan은 기존 `docs/work-plans/supabase-prisma-nextauth-setup.md`(Phase 1~6 실행 상태 혼재)를 **대체하지 않고 보완**한다. P0 수정 코드는 그 plan의 Phase 3·4를 source로 재사용하며, 본 plan은 차이점만 기술한다. (재발명 금지)

### Interview Summary
**확정된 3가지 결정**:
- **Test DB 전략 = 하이브리드**: signup/verify/authorize 단위테스트는 Prisma mock(`vi.mock("@/lib/prisma")` 또는 vitest-mock-extended). signup→verify→login end-to-end 통합테스트 **1개만** CI의 실제 postgres:16 service container + `prisma db push`로 실행.
- **PR 분할 = 2-PR**:
  - PR#1 = 인프라 (CI green 유지: 통과하는 smoke 테스트만 포함, 버그는 건드리지 않음).
  - PR#2 = P0 인증 수정 + 인증 테스트(단위 mock + 통합 실DB)를 **같은 PR에**. 근거: BLF "테스트는 구현과 같은 commit" 원칙. 통합테스트를 PR#1에 두면 버그 미수정 상태라 CI가 RED가 되므로, 반드시 수정과 같은 PR#2에 둔다.
  - 통합테스트 GREEN = 수정 DoD.
- **ADR = 신규 결정 3개만** (Nygard 양식: Status/Date/Context/Options/Decision/Consequences):
  - ADR-001 인메모리→DB verification store 전환
  - ADR-002 인증 비밀번호 해시 sha256→bcrypt 통일
  - ADR-003 test DB 전략 (하이브리드: 단위 mock + 통합 실Postgres)

### Research Findings
- **코드 실측 (Explore Agent)**:
  - `lib/verification-store.ts` — 전 함수 sync, globalThis `Map`, `randomInt` 사용. (Phase 3 미실행)
  - `app/api/auth/signup/route.ts:48` — `createHash("sha256")` (bcrypt 아님), `setVerification` sync 호출(line 50), 이메일 중복확인 없음. (Phase 4 미실행 = P0)
  - `app/api/auth/verify/route.ts:73-77` — 가짜 `user-${Date.now()}` 반환, `prisma.user.create` 없음 → User가 DB에 안 생김 → login 영구 실패. `getVerification` sync(line 36). (Phase 4 미실행 = P0)
  - `app/api/auth/resend/route.ts` — sync store.
  - **기존 패턴(재사용)**: `lib/auth.ts`에 `normalizeEmail`/`normalizeName`/`isValidEmail`/`extractErrorMessage`/`MIN_PASSWORD_LENGTH=8`/`VERIFICATION_CODE_LENGTH=6` 존재. try-catch는 핸들러 최상위만, `{success,error}` 응답 형식. `@/types`에 `SignupRequest`/`VerifyEmailRequest` 타입 존재.
  - **인프라 전무**: vitest.config 없음, 프로젝트 `*.test` 없음, `.github/workflows` 없음, 프로젝트 `.claude/` 없음. `eslint.config.mjs`(next core-web-vitals+ts), `tsconfig`(strict+`@/*` alias) 있음.
- **외부 베스트프랙티스 (Librarian)**:
  - Vitest+Next16+React19 설치: `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`. `vitest.config.mts`에 `plugins:[tsconfigPaths(), react()]`, `test.environment:'jsdom'`. @testing-library/react v16+ React19 호환.
  - Route handler 테스트: `POST` 함수 직접 import + `new Request`로 호출, `response.json()` 검증.
  - Prisma 단위 mock: `vi.mock("@/lib/prisma")`로 `user.create`/`user.findUnique` mock.
  - GitHub Actions: `services.postgres`(postgres:16-alpine, health-cmd `pg_isready`), env `DATABASE_URL=postgres://...localhost:5432`, steps: checkout→setup-node22(cache npm)→`npm ci`→`prisma generate`→`tsc --noEmit`→lint→`prisma db push --skip-generate`→vitest. `NEXTAUTH_SECRET`은 CI용 더미.

### Metis Review
**Identified Gaps** (addressed in plan):
- **Hidden Complexity — store sync→async 의존성**: 테스트가 현재 sync store에 의존하나, PR#2에서 store를 async 전환하며 동시에 테스트한다. verify의 DB `User` 생성을 assert하는 통합테스트는 수정 **전이면 RED**여야 정상(red→green). → PR#2 Task 순서를 "테스트 먼저 작성(RED 확인) → 수정(GREEN)"으로 명시하여 처리.
- **Scope Creep**: 2-PR 분리로 완화. PR#1은 버그를 절대 건드리지 않고 통과하는 smoke 테스트만 둠 → CI green 유지.
- **Consistency 불변식**: signup(현 sha256) ↔ login/authorize(bcrypt) 해시 불일치가 로그인 실패의 또 다른 원인. PR#2 signup bcrypt 통일로 해소(ADR-002).

## Prerequisites
- [ ] 현 브랜치 `docs/workflow-adoption-report` 기준. main 직접 commit 차단 hook 작동 중 → 두 작업 모두 feature branch + PR 필수.
- [ ] `.env.local`에 PR#2 통합테스트용 로컬 Postgres가 필요할 수 있음 (로컬은 mock으로 대체 가능, 통합테스트 실DB는 CI에서 강제). CI는 service container가 제공.
- [ ] 기존 `supabase-prisma-nextauth-setup.md` Phase 1,2(패키지/schema.prisma/lib/prisma.ts)·Phase 5,6 완료 상태 확인됨 (auth.ts/login은 이미 bcrypt+prisma 기대).

---

## TODOs

> 레이블 규칙: PR#1 = `1.`~`9.`, PR#2 = `10.`~`16.`, Final Verification = `F1.`~`F4.`.
> PR 경계는 절대 섞지 않는다. PR#1 머지 후 PR#2 진행.

### PR#1 — 인프라 (CI green 유지)

#### Wave 1 (병렬 — 독립 셋업 파일)

- [x] 1. vitest + RTL 패키지 설치 + npm 스크립트 추가 `category:quick`
  **Goal**: `npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths` 완료, `package.json` scripts에 `"test": "vitest run"`, `"test:watch": "vitest"` 추가. `npm run test`가 (테스트 0개라도) exit 0.
  **References**:
  - `package.json` — 기존 scripts(`dev/build/start/lint`)·devDependencies 보존, 추가만. (Surgical change)
  - 외부 BP(Librarian): @testing-library/react v16+ = React19 호환 버전 고정.
  **Must NOT do**: 기존 의존성 버전 변경 금지. `@testing-library/jest-dom`은 smoke 단계 불필요 시 생략(과잉 회피). 커버리지 패키지(`@vitest/coverage-*`) 설치 금지(OUT-of-scope).
  **QA Scenarios**:
  - Happy: `npm ls vitest @testing-library/react` → 설치된 버전 출력, 에러 없음.
  - Verify: `npm run test` → "No test files found" 또는 0 passed, exit 0.

- [x] 2. `vitest.config.mts` 작성 `category:quick`
  **Goal**: 프로젝트 루트에 `vitest.config.mts` 생성. `plugins: [tsconfigPaths(), react()]`, `test: { environment: "jsdom", globals: true, include: ["**/*.test.{ts,tsx}"] }`. `@/*` alias가 테스트에서 해석됨.
  **References**:
  - `tsconfig.json` — `@/*` paths alias 존재 → `vite-tsconfig-paths`가 이를 그대로 사용(중복 정의 금지).
  - 외부 BP(Librarian): `vitest.config.mts` 권장 형식.
  **Must NOT do**: `next.config` 수정 금지. alias를 config에 하드코딩 금지(tsconfigPaths가 처리). setupFiles는 smoke 단계 불필요 시 생략.
  **QA Scenarios**:
  - Happy: config 파일에서 `@/lib/...` import하는 테스트가 모듈 해석 성공.
  - Edge: `npm run test` 시 jsdom 환경에서 `document` 정의됨(에러 없음).

- [x] 3. 권한 allowlist `.claude/settings.local.json` 작성 `category:quick`
  **Goal**: 프로젝트 `.claude/settings.local.json` 생성. 반복되는 안전 명령(`npm run test`, `npx tsc --noEmit`, `npm run lint`, `git status`, `npx prisma generate` 등) allow 등록.
  **References**:
  - `~/.claude/settings.json`(전역) 패턴 — 프로젝트 로컬은 보충만.
  - 분석 리포트 §4 P1.4 — `/fewer-permission-prompts` 패턴 차용.
  **Must NOT do**: 파괴적 명령(`rm -rf`, `git push --force`, `git commit`(main)) allow 금지. 시크릿 노출 명령 금지.
  **QA Scenarios**:
  - Happy: JSON parse 유효(`node -e "JSON.parse(require('fs').readFileSync('.claude/settings.local.json'))"`).
  - Negative: main 직접 commit이 allowlist에 없음(차단 hook 유지).

#### Wave 2 (Wave 1 완료 후 — smoke 테스트는 config 의존)

- [x] 4. smoke 테스트 1개 작성 (통과하는 사소한 것) `category:quick`
  **Goal**: `lib/auth.test.ts`(또는 `__tests__/smoke.test.ts`)에 기존 순수 함수 `normalizeEmail`/`isValidEmail`을 검증하는 통과 테스트 작성. PR#1 CI를 green으로 만드는 안전한 첫 테스트. **버그 코드는 절대 import하지 않음.**
  **References**:
  - `lib/auth.ts` — `normalizeEmail("  A@B.COM ")` → `"a@b.com"`, `isValidEmail` 검증 대상(순수·결정적·DB 무관).
  **Must NOT do**: signup/verify/store(async 미전환) import 금지(버그 노출 = CI red). DB·prisma mock 금지(PR#1은 인프라만).
  **QA Scenarios**:
  - Happy: `normalizeEmail("  Test@Example.COM ")` → `"test@example.com"` (toBe).
  - Edge: `isValidEmail("not-an-email")` → `false`; `isValidEmail("test@example.com")` → `true`.
  - Verify: `npm run test` → 1+ passed, 0 failed, exit 0.

#### Wave 3 (병렬 — CI + 문서, smoke 테스트 통과 확인 후)

- [x] 5. 최소 CI `.github/workflows/ci.yml` 작성 (1-job) `category:ultrabrain`
  **Goal**: PR 트리거 단일 job. steps: checkout → setup-node@22(cache npm) → `npm ci` → `npx prisma generate` → `npx tsc --noEmit` → `npm run lint` → `npm run test`. 모두 exit 0 강제. **PR#1 단계에서는 Postgres service container 불필요**(smoke 테스트가 DB 미사용). Postgres service는 PR#2에서 통합테스트 추가 시 같은 워크플로우에 적층(Task 16).
  **References**:
  - 외부 BP(Librarian): setup-node22 cache npm, `prisma generate` 선행.
  - 분석 리포트 §4 P0.2 — "단일 job — tsc + lint + test" 축소판.
  **Must NOT do**: CI 매트릭스(다중 node/OS) 금지. e2e/Playwright step 금지. 커버리지 게이트 금지. `npm run build`는 비용 크면 생략(tsc로 타입 검증 대체) — 단 build 누락 리스크는 Risks에 기록.
  **QA Scenarios**:
  - Happy: PR push 시 Actions 탭에서 job green(전 step exit 0).
  - Edge: 의도적으로 타입 에러 1줄 추가 → `tsc --noEmit` step RED → job 실패(게이트 동작 확인 후 revert).
  - Negative: lint 위반 시 job 차단.

- [x] 6. `AGENTS.md` 작성 (~80줄, BLF 180줄 축소판) `category:writing`
  **Goal**: 프로젝트 루트 `AGENTS.md`. 섹션: Stack · Commands(dev/build/test/lint/prisma) · **Boundaries(Allowed/Ask First/Forbidden)** · Anti-Patterns · Git Policy.
  **References**:
  - 분석 리포트 §4 P1.3 — potata 특화 Forbidden 목록.
  - `~/.claude/rules/coding-standards.md`·`github-workflow.md` — 전역 룰과 중복 회피(프로젝트 특화만).
  **Must NOT do**: 전역 룰 복붙 금지. 180줄 풀 복사 금지(축소판). Alex 7 Invariants 전체 이식 금지(potata 관련 항목만).
  **Potata 특화 Forbidden(필수 포함)**: `.env*` commit 금지, main 직접 commit 금지, **signup/login 해시 알고리즘 불일치 금지**(sha256↔bcrypt), 가짜 user 객체(`user-${Date.now()}`) 영구화 금지.
  **QA Scenarios**:
  - Happy: 5개 섹션 모두 존재, Forbidden에 해시 불일치 항목 포함.
  - Verify: 80줄 ±20 이내(축소 유지).

- [x] 7. `CLAUDE.md` 작성 (@AGENTS.md import 한 줄 + Claude 전용 노트) `category:writing`
  **Goal**: 프로젝트 루트 `CLAUDE.md`. 첫 줄 `@AGENTS.md` import, 그 아래 Claude 전용 짧은 노트(테스트 명령·PR 분할 정책 링크)만.
  **References**:
  - 분석 리포트 §4 P1.3 — "CLAUDE.md는 @AGENTS.md import 한 줄".
  **Must NOT do**: AGENTS.md 내용 중복 금지(import만). 전역 `~/.claude/CLAUDE.md` 복붙 금지.
  **QA Scenarios**:
  - Happy: 첫 줄 `@AGENTS.md`, 본문 10줄 이하.

- [x] 8. `docs/work-plans/roadmap.md` Master roadmap 작성 `category:writing`
  **Goal**: P0~P3 인덱스 1개 파일. P0(인증 복구=본 plan PR#2), P1(try-on 보안), P2(UX), P3(카탈로그 DB화). 산발 docs(`supabase-prisma-nextauth-setup.md`·`workflow-adoption-report.md`·본 plan) 링크 통합.
  **References**:
  - 분석 리포트 §4 P2.5.
  - `docs/work-plans/` 디렉터리 내 기존 plan 파일들 — 링크 대상.
  **Must NOT do**: 각 항목 상세 plan 작성 금지(인덱스만). 미정 항목 임의 결정 금지(placeholder 표시).
  **QA Scenarios**:
  - Happy: P0~P3 4개 섹션, 본 plan PR#2가 P0에 링크됨.

- [x] 9. ADR 3개 + 경량 `session.md` 작성 `category:writing`
  **Goal**: `docs/adr/` 디렉터리에 ADR-001/002/003 (Nygard 양식: Status/Date/Context/Options/Decision/Consequences). `.claude/rules/session.md`(~20줄: 북극성 골 + "지금 작업" goal+DoD+선결, 시점 변환 룰 적용 — "이번/다음 세션" 표현 금지).
  **References**:
  - 분석 리포트 §4 P2.6·P2.7, 부록 — Nygard 양식 / `.claude/rules/session.md` 패턴.
  - 확정 결정 3개 = ADR 3개 내용 source.
  **ADR stubs** (하단 "ADR Stubs" 섹션 참조).
  **Must NOT do**: ADR 4개 이상 금지. handoff hook 자동화 금지(수동). 확정 기술결정을 ADR에서 재검토/번복 금지(소급 기록만).
  **QA Scenarios**:
  - Happy: `docs/adr/adr-001-*.md`~`adr-003-*.md` 3개 존재, 각 6개 Nygard 섹션 포함.
  - Edge: `session.md`에 "다음 세션" 등 시점 표현 0개.
  - Verify: ADR 개수 정확히 3 (4개 이상이면 scope 위반).

### PR#2 — P0 인증 수정 + 인증 테스트 ~~(테스트=수정과 같은 PR)~~ — **취소됨**

> **⚠️ PR#2 취소**: P0 인증 버그(signup sha256, verify 가짜 user, verification-store 인메모리)가 origin/main(#11/#12/2c47833)에서 이미 해결됨. Task 10~16은 실행되지 않았으며 불필요해짐. 아래 내용은 이력 보존 목적으로 유지.
>
> ~~진행 전제: PR#1 머지 완료(vitest·CI 인프라 존재). 새 브랜치 `fix/auth-user-creation`.~~
> ~~**수정 코드 source**: 기존 `docs/work-plans/supabase-prisma-nextauth-setup.md` Phase 3·4. 아래는 그 코드를 재사용하되 potata 현 코드 대비 **차이점만** 명시.~~

#### Wave 4 (먼저 — RED 확인용 테스트 작성, 수정 전)

- [ ] 10. 인증 통합테스트 작성 → RED 확인 (수정 전) `category:ultrabrain`
  **Goal**: `__tests__/auth-flow.integration.test.ts`에 signup→verify→login 시나리오 1개 작성. verify 후 `prisma.user.findUnique`로 DB `User` row 존재 + authorize 성공을 assert. **현재 버그 상태에서 실행하면 RED**여야 정상(verify가 user.create 안 함). 이 RED가 P0 수정의 DoD 기준선.
  **References**:
  - `app/api/auth/verify/route.ts:73-77` — 가짜 user 반환, `prisma.user.create` 없음(이 테스트가 잡아야 할 버그).
  - 외부 BP(Librarian): route handler 직접 import + `new Request`, postgres:16 service container + `prisma db push`.
  - 확정 결정 = 통합테스트는 실 Postgres 1개만.
  **Must NOT do**: 통합테스트를 mock으로 작성 금지(실DB여야 함). 2개 이상 통합테스트 작성 금지(1개만, 과잉 회피). PR#1에 두지 말 것(이미 PR#2).
  **QA Scenarios**:
  - Happy(수정 후 기대): signup POST → verify POST(devCode 사용) → `prisma.user.findUnique({where:{email}})` 반환 truthy → authorize(email,pw) 반환 user.
  - **RED(수정 전 기대)**: 동일 실행 시 `user.findUnique` → `null` → 테스트 FAIL. 이 실패를 캡처/기록(red→green 증명).
  - Negative: 잘못된 code로 verify → user 미생성, login 실패.
  - Verify: 수정 전 `npm run test auth-flow.integration` → 1 failed (RED 확인).

- [ ] 11. 인증 단위테스트 작성 (Prisma mock) → RED 확인 `category:ultrabrain`
  **Goal**: `app/api/auth/signup/route.test.ts`·`verify/route.test.ts`·`auth.test.ts`(authorize)에 `vi.mock("@/lib/prisma")` 기반 단위테스트. signup이 bcrypt 해시 저장·중복확인, verify가 `prisma.user.create` 호출, authorize가 `bcrypt.compare` 사용을 assert.
  **References**:
  - 외부 BP(Librarian): `vi.mock("@/lib/prisma")`로 `user.create`/`user.findUnique` mock.
  - `app/api/auth/signup/route.ts:48` — sha256 사용(테스트가 bcrypt 기대로 RED).
  - 루트 `auth.ts:14-46`(NextAuth authorize, 이미 구현됨) — `bcrypt.compare`·`emailVerified` 게이트. (※ 파일 구분: `lib/auth.ts`=검증 헬퍼 모듈, 루트 `/auth.ts`=NextAuth 설정. plan 전체에서 동일 규칙 적용.)
  **Must NOT do**: 단위테스트에 실DB 사용 금지(mock만). vitest-mock-extended는 단순 `vi.mock`으로 충분하면 미사용(과잉 회피).
  **QA Scenarios**:
  - Happy(수정 후): signup mock 호출 시 `setVerification`에 전달된 `passwordHash`가 bcrypt 형식(`$2`로 시작) assert.
  - **RED(수정 전)**: signup이 sha256 hex 저장 → bcrypt assert FAIL.
  - Edge: 중복 email(`findUnique` mock이 기존 user 반환) → signup 409 응답.
  - Negative: verify가 `prisma.user.create`를 호출하지 않으면(현 코드) mock의 create call count 0 → FAIL.

#### Wave 5 (수정 — Wave 4 RED 확인 후, 순차 의존)

- [ ] 12. `lib/verification-store.ts` async DB 전환 `category:ultrabrain`
  **Goal**: 전 함수 sync→async, globalThis `Map`→Prisma `verificationCode` 테이블. 기존 plan Phase 3 코드를 source로 적용.
  **References (source = 기존 plan, 차이점만 적용)**:
  - `docs/work-plans/supabase-prisma-nextauth-setup.md:172-274` — **그대로 재사용할 source 코드**(setVerification/getVerification/incrementAttempts/deleteVerification async, isExpired sync).
  - **차이점 1**: 현 코드는 `randomInt(100000,1000000)` 사용(`lib/verification-store.ts:48`). source의 `Math.random` 대신 **기존 `randomInt` 유지**(보안상 우수, surgical).
  - **차이점 2**: 현 코드는 `setInterval` cleanup·`normalizeKey` 보유 → DB 전환 시 `setInterval` 제거(DB는 `expiresAt` 인덱스로 만료 처리), `normalizeKey`는 호출부가 이미 `normalizeEmail` 사용하므로 store 내부 정규화 제거 가능.
  - **차이점 3**: source `setVerification` 시그니처와 현 `Omit<VerificationEntry,"attempts">` 시그니처 정합 — `@/types`·호출부 타입 깨지지 않게 유지.
  - `prisma/schema.prisma:106-118`(기존 plan) — `VerificationCode` 모델 이미 정의됨(재정의 금지).
  **Must NOT do**: Redis 도입 금지(OUT-of-scope). `Math.random`으로 다운그레이드 금지. globalThis Map 잔존 금지(완전 제거).
  **QA Scenarios**:
  - Happy: `setVerification` → DB row 생성, `getVerification` → 동일 데이터 반환(통합테스트가 커버).
  - Edge: 동일 email 재호출 시 `deleteMany` 후 create(중복 row 없음).
  - Negative: 없는 email `getVerification` → `undefined`.

- [ ] 13. `app/api/auth/signup/route.ts` 수정 (sha256→bcrypt, async store, 중복확인) `category:ultrabrain`
  **Goal**: `createHash("sha256")` → `bcrypt.hash(password, 12)`, `setVerification` await, `prisma.user.findUnique` 이메일 중복확인(409) 추가.
  **References (source = 기존 plan, 차이점만 적용)**:
  - `docs/work-plans/supabase-prisma-nextauth-setup.md:286-385` — source 코드.
  - `app/api/auth/signup/route.ts:2,48,50` — 제거 대상(`createHash` import, sha256 라인, sync setVerification).
  - **차이점(필수)**: source는 검증 로직(emailRegex/길이)을 인라인하나, **potata 현 코드의 `@/lib/auth` 상수·헬퍼(`normalizeEmail`/`normalizeName`/`isValidEmail`/`MIN_PASSWORD_LENGTH`/`extractErrorMessage`)와 `@/types`의 `SignupRequest`를 유지**(기존 패턴 보존, surgical). source의 인라인 정규식으로 회귀 금지.
  **Must NOT do**: 기존 `@/lib/auth` 헬퍼 제거 금지. devCode(dev 환경) 응답 제거 금지. 에러 응답 형식 `{success,error}` 변경 금지.
  **QA Scenarios**:
  - Happy: 신규 email signup → 200, `setVerification`에 bcrypt 해시 저장(단위테스트 Task 11이 커버).
  - Edge: 기존 email signup → 409 "이미 가입된 이메일입니다."
  - Negative: pw 8자 미만 → 400(기존 `MIN_PASSWORD_LENGTH` 유지).

- [ ] 14. `app/api/auth/verify/route.ts` 수정 (가짜 user→`prisma.user.create`, async store) `category:ultrabrain`
  **Goal**: 가짜 `user-${Date.now()}` 제거 → `prisma.user.create({ data: { email,name,passwordHash,emailVerified:true } })`. `getVerification`/`incrementAttempts`/`deleteVerification` await.
  **References (source = 기존 plan, 차이점만 적용)**:
  - `docs/work-plans/supabase-prisma-nextauth-setup.md:387-493` — source 코드.
  - `app/api/auth/verify/route.ts:36,46,62,73-80` — 수정 대상(sync getVerification, sync delete/increment, 가짜 user 블록, 거짓 "created" 로그).
  - **차이점**: 현 코드는 `VERIFICATION_CODE_LENGTH` 검증·`normalizeEmail`·`extractErrorMessage`·`@/types`의 `VerifyEmailRequest` 사용 → 유지. source의 인라인 검증으로 회귀 금지.
  **Must NOT do**: 가짜 user 객체 흔적 잔존 금지. "created" 로그가 실제 create 없이 찍히지 않게(No Silent Fallback). `code.trim()` 중복(현 코드는 line 20에서 이미 trim) 주의.
  **QA Scenarios**:
  - Happy: 올바른 code verify → `prisma.user.create` 호출 → DB row 존재 → 200 with real user.id(cuid).
  - Edge: 만료/시도초과 → user 미생성, 410/429.
  - Negative: 코드 불일치 → `incrementAttempts` await, user 미생성, 400.

- [ ] 15. `app/api/auth/resend/route.ts` 수정 (async store) `category:ultrabrain`
  **Goal**: `getVerification`/`setVerification` await 추가. 나머지 로직 동일.
  **References (source = 기존 plan, 차이점만 적용)**:
  - `docs/work-plans/supabase-prisma-nextauth-setup.md:496-568` — source 코드.
  - `app/api/auth/resend/route.ts` — sync store 호출부에 await만 추가(surgical).
  - **차이점**: 현 코드의 `@/lib/auth` 헬퍼·`extractErrorMessage` 유지.
  **Must NOT do**: 검증·이메일 로직 재작성 금지(await만 추가). devCode(dev) 응답 제거 금지.
  **QA Scenarios**:
  - Happy: 기존 verification 존재 시 resend → 새 code DB 저장, 200.
  - Negative: verification 없음 → 404.

#### Wave 6 (검증 — 수정 완료 후 GREEN 전환 + CI에 Postgres 추가)

- [ ] 16. CI에 Postgres service container 추가 + 전체 테스트 GREEN 확인 `category:ultrabrain`
  **Goal**: `.github/workflows/ci.yml`에 `services.postgres`(postgres:16-alpine, health-cmd `pg_isready`) 추가. env `DATABASE_URL=postgres://...localhost:5432`, `DIRECT_URL` 동일, `NEXTAUTH_SECRET`=CI 더미. steps에 `npx prisma db push --skip-generate`를 test 전에 추가. Wave 4·5 완료 후 통합+단위 테스트 모두 GREEN.
  **References**:
  - 외부 BP(Librarian): postgres:16-alpine service, health-cmd, `prisma db push --skip-generate`.
  - Task 5 `.github/workflows/ci.yml` — 같은 파일에 service 적층(새 워크플로우 파일 만들지 말 것).
  **Must NOT do**: 2-job 분리 금지(단일 job 유지). e2e step 금지. 프로덕션 Supabase URL을 CI에 노출 금지(service container의 localhost만).
  **QA Scenarios**:
  - Happy: PR#2 push → CI에서 postgres service 기동 → `prisma db push` 성공 → 통합테스트(Task 10) GREEN, 단위테스트(Task 11) GREEN.
  - Edge: service container health check 실패 시 job fail(=DB 미준비 감지).
  - **DoD**: Task 10 통합테스트 GREEN = P0 수정 완료 판정.

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|-----------|--------|
| 1 | None | 패키지 설치 선행 |
| 2 | 1 | vitest 설치 후 config |
| 3 | None | 독립 (권한 파일) |
| 4 | 2 | config 있어야 테스트 실행 |
| 5 | 4 | smoke green 후 CI 게이트 |
| 6 | None | 문서 독립 |
| 7 | 6 | AGENTS.md import |
| 8 | None | 문서 독립 |
| 9 | None | 문서 독립 (ADR source=확정결정) |
| 10 | PR#1 머지 | vitest+CI 인프라 필요, RED 기준선 |
| 11 | PR#1 머지 | mock 단위테스트 |
| 12 | 10, 11 | RED 확인 후 store 수정 |
| 13 | 12 | store async 후 signup await |
| 14 | 12 | store async 후 verify await |
| 15 | 12 | store async 후 resend await |
| 16 | 13, 14, 15 | 수정 완료 후 GREEN+Postgres CI |

---

## Parallel Execution Graph

**PR#1**:
```
Wave 1 (즉시, 병렬):
├── Task 1: vitest 패키지 설치
├── Task 2: vitest.config.mts   (Task1 직후)
└── Task 3: 권한 allowlist

Wave 2:
└── Task 4: smoke 테스트 (Task 2 후)

Wave 3 (병렬):
├── Task 5: 최소 CI (Task 4 후)
├── Task 6: AGENTS.md
├── Task 7: CLAUDE.md (Task 6 후)
├── Task 8: roadmap.md
└── Task 9: ADR 3개 + session.md
```
PR#1 Critical Path: Task 1 → 2 → 4 → 5

**PR#2** (PR#1 머지 후):
```
Wave 4 (병렬 — RED 작성):
├── Task 10: 통합테스트 (RED)
└── Task 11: 단위테스트 mock (RED)

Wave 5 (RED 확인 후, 순차):
└── Task 12: store async → (병렬) Task 13/14/15: signup/verify/resend await

Wave 6:
└── Task 16: Postgres CI + GREEN 확인 (DoD)
```
PR#2 Critical Path: Task 10/11 (RED) → Task 12 → Task 14 → Task 16 (GREEN=DoD)

---

## Category + Skills

| Task | Category | Category Reason |
|------|----------|-----------------|
| 1 | quick | 패키지 설치·스크립트, 로직 없음 |
| 2 | quick | 단일 config 파일 |
| 3 | quick | 단일 JSON allowlist |
| 4 | quick | 순수 함수 smoke 테스트 |
| 5 | ultrabrain | CI 게이트 설계(빌드/타입/lint/test 순서·exit 강제) |
| 6 | writing | 문서(AGENTS.md) |
| 7 | writing | 문서(CLAUDE.md import) |
| 8 | writing | 문서(roadmap 인덱스) |
| 9 | writing | 문서(ADR Nygard + session.md) |
| 10 | ultrabrain | 통합테스트 설계(실DB, red→green 기준선) |
| 11 | ultrabrain | mock 전략·해시 형식 assert |
| 12 | ultrabrain | sync→async 전환, store 재작성 |
| 13 | ultrabrain | 해시 통일·중복확인·async 배선 |
| 14 | ultrabrain | DB User 생성 배선(P0 핵심) |
| 15 | ultrabrain | async 배선 |
| 16 | ultrabrain | CI Postgres service·DoD 판정 |

---

## ADR Stubs (Task 9 산출물 — Nygard 양식, 작성 완료)

- **ADR-001 — 인메모리 → DB verification store 전환** (`docs/adr/adr-001-db-verification-store.md`)
  한 줄: globalThis Map 기반 인메모리 store → Prisma `VerificationCode` 테이블(Supabase Postgres)로 전환. `lib/verification-store.ts` dead code 삭제 완료. API 라우트(signup/verify/resend)가 Prisma 직접 사용. Status: Accepted — **origin/main에서 구현 완료**.
- **ADR-002 — 인증 비밀번호 해시 bcrypt 통일** (`docs/adr/adr-002-bcrypt-password-hash.md`)
  한 줄: signup sha256, login/authorize bcrypt 불일치(stale 브랜치 잔재) → bcrypt(cost 10)로 전 경로 통일. 기존 sha256 해시 유저 없음(신규 시스템)이라 마이그레이션 불요. Status: Accepted — **origin/main에서 구현 완료**.
- **ADR-003 — 테스트 DB 전략 (하이브리드)** (`docs/adr/adr-003-test-db-strategy.md`)
  한 줄: 단위테스트는 Prisma mock(빠름·격리), 통합테스트 1개만 실 postgres:16 service container+`prisma db push`(진짜 DB 배선 검증). 옵션 검토: 전부 mock(배선 미검증) / 전부 실DB(느림·과잉) / 하이브리드(채택). Status: Accepted.

---

## Final Verification Wave

- [ ] F1. PR#1 게이트 통과 검증
  도구/단계: PR#1 브랜치에서 `npx tsc --noEmit` exit 0 + `npm run lint` exit 0 + `npm run test` exit 0(smoke green) + GitHub Actions CI job green. 기대결과: 전 명령 exit 0, CI 초록. 버그 코드 미import로 CI red 없음.
- [ ] F2. PR#2 RED→GREEN 전이 검증
  도구/단계: 수정 전 commit에서 `npm run test auth-flow.integration` → 1 failed(RED 기록) 확인. 수정 후 → 0 failed(GREEN). 기대결과: red→green 전이 git 히스토리/CI 로그로 증명(No Silent Fallback).
- [ ] F3. P0 인증 복구 DoD 검증 (실 DB 배선)
  도구/단계: CI Postgres service에서 signup→verify→`prisma.user.findUnique` row 존재→authorize 성공. 기대결과: verify가 실제 `prisma.user.create` 호출(가짜 user 제거됨), `User` row 생성, login authorize truthy. 통합테스트 GREEN = DoD 충족.
- [ ] F4. Scope/일관성 검증 (right-sized + 불변식)
  도구/단계: ADR 정확히 3개(`ls docs/adr` → 3), OUT-of-scope 항목(Redis/Playwright/coverage gate/CI matrix) plan·코드에 0개, signup·login·authorize 해시가 모두 bcrypt(grep `createHash`/`sha256` → 0건). 기대결과: 과잉 0, 해시 일관성 100%.

---

## Test Strategy (하이브리드 — 확정)

- [ ] **단위테스트 (Prisma mock)**: signup/verify/authorize. `vi.mock("@/lib/prisma")`로 `user.create`/`user.findUnique` mock. 빠르고 DB 격리. (Task 11)
  - 대상: signup bcrypt 해시·중복확인(409), verify의 `prisma.user.create` 호출, authorize `bcrypt.compare`+`emailVerified` 게이트.
- [ ] **통합테스트 (실 Postgres, 1개만)**: signup→verify→login end-to-end. CI postgres:16 service container + `prisma db push`. (Task 10)
  - 진짜 DB에 User row가 생기는지 = P0 버그를 직접 잡는 안전망.
- [ ] **smoke (PR#1)**: 순수 함수(`normalizeEmail`/`isValidEmail`) 통과 테스트. CI green 유지용. (Task 4)
- [ ] **정책**: 테스트는 구현과 **같은 commit/PR**(BLF). 그래서 인증 테스트는 PR#2(수정과 동거), PR#1에는 smoke만.
- **OUT**: e2e Playwright, 커버리지 게이트, MSW (현 단계 과잉).

## Success Criteria

- [ ] PR#1: `tsc --noEmit`/`lint`/`test`(smoke) 모두 exit 0, CI job green, 버그 미접촉.
- [ ] PR#1 산출물 존재: `vitest.config.mts`, `.github/workflows/ci.yml`, `AGENTS.md`, `CLAUDE.md`, `.claude/settings.local.json`, `docs/work-plans/roadmap.md`, `docs/adr/adr-00{1,2,3}-*.md`(정확히 3개), `.claude/rules/session.md`.
- [ ] PR#2: 통합테스트(signup→verify→login, 실DB User row) GREEN = P0 수정 DoD 충족.
- [ ] `lib/verification-store.ts` 전 함수 async + Prisma(globalThis Map 0건).
- [ ] signup/login/authorize 해시 전부 bcrypt(sha256·createHash 0건 — grep 검증).
- [ ] verify가 실제 `prisma.user.create` 호출(가짜 `user-${Date.now()}` 제거).
- [ ] right-sized 유지: ADR 정확히 3개, OUT-of-scope 항목 미도입.

## Risks / Rollback

| Risk | 영향 | 완화/롤백 |
|------|------|-----------|
| PR#1 smoke가 실수로 버그 코드 import → CI red | PR#1 머지 차단 | Task 4 Must NOT do 강제(순수 함수만). 위반 시 import 제거. |
| store async 전환이 호출부(signup/verify/resend) await 누락 → 런타임 Promise 버그 | 로그인 재고장 | tsc(strict)가 `Promise<T>` 미await를 일부 잡음 + 통합테스트가 최종 게이트. Task 12→13/14/15 순서 강제. |
| CI에서 `npm run build` 생략 → 빌드 전용 에러 미검출 | 배포 시 발견 | tsc --noEmit로 타입 커버. 빌드 에러 리스크는 배포 전 `npm run build` 수동 1회로 보완(roadmap P3). |
| Postgres service container 미기동/health 실패 | 통합테스트 flaky | health-cmd `pg_isready` + retries. 실패 시 job fail로 명확히 노출(silent pass 금지). |
| 통합테스트가 prod Supabase를 침범 | 데이터 오염 | CI는 service container localhost만 사용(prod URL CI 미주입). Task 16 Must NOT do. |
| sha256 기존 유저 데이터 마이그레이션 | 해시 mismatch | 신규 시스템(기존 User row 없음) → 마이그레이션 불요(ADR-002 Consequences 기록). |

**Rollback 전략**:
- PR#1: 인프라 추가뿐(런타임 코드 무변경) → revert로 안전 복귀, 프로덕션 영향 0.
- PR#2: feature branch + PR 단위. 통합테스트 RED면 머지 차단되므로 깨진 코드가 main에 안 들어감. 머지 후 회귀 시 PR revert(원자적 commit).
