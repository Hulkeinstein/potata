# BLF AX 워크플로우 분석 → potata 적용 리포트

> 작성: 2026-06-15 · 분석 대상: `E:\kamwoo\6.Programing\BLF AX\blf-dashboard` · 적용 대상: `potata`
> 목적: 성숙한 OMO 프로젝트(BLF AX)의 워크플로우를 분석하고, potata 규모에 맞는 **right-sized** 하위 집합만 선별 적용한다. (과잉 도입 = 위반)

---

## 0. TL;DR

BLF AX는 **원칙 → 절차 → 산출물 → 자동화 → 검증**의 5계층 워크플로우를 갖춘 production-grade 프로젝트다. potata는 그중 **3개만 즉시 도입**하면 ROI가 가장 크다:

1. **`AGENTS.md` 프로젝트 SSoT** (stack·commands·boundaries·anti-patterns) — 지금 potata엔 프로젝트 레벨 에이전트 컨텍스트가 **전무**(전역 룰에만 의존).
2. **최소 CI + 테스트(vitest)** — potata는 CI·테스트 **0개**. 인증 버그를 잡았을 단 하나의 안전망.
3. **`session.md` "지금 작업" 레지스트리** — 세션 간 연속성.

나머지(verify-*.ps1 적대 게이트, Docker standalone, 16개 ADR, 멀티엔진)는 **현 단계 potata엔 과잉** → 배포·확장 시점에 도입.

> **핵심 통찰**: BLF AX 워크플로우는 *우리가 방금 potata에서 찾은 인증 버그를 정확히 막도록* 설계돼 있다. (§3 참조)

---

## 1. BLF AX 워크플로우 해부 (5계층)

### 계층 1 — 원칙 (Alex 7 Invariants)
`AGENTS.md §0`. 모든 작업이 준수, 위반 = blocker.

| # | 원칙 | 본질 |
|---|------|------|
| 1 | SSoT | 단일 진실 원천 (AGENTS.md, Prisma는 한 곳만) |
| 2 | SoC/SRP | UI·로직·라우팅·도메인 경계 분리 |
| 3 | Consistency | `package.json` ↔ 문서 ↔ 실제 코드 일치 |
| 4 | Atomicity | 1 commit = 1 의도 |
| 5 | Idempotency | 동일 입력 = 동일 결과 |
| 6 | **No Silent Fallback** | **워커 자기보고 신뢰 X — exit code/file/test로 직접 검증** |
| 7 | Doc-first / Plan-first | 작업 전 plan 필수 |

### 계층 2 — 절차 (Coding 5단계)
`docs/workflow.md`. **단계 건너뛰기 금지**가 핵심.

```
1. Phase 분해      → task 식별 + 의존성 + 크기
2. Skeleton plan   → 전체 task 경량 골격 (장황 금지)
3. 작업 직전 보완  → 해당 task만 상세화 + grep으로 stale 라인 재확인
4. 코드 작업       → atlas → coder → validator (+ oracle 적대검증)
5. 커밋 + PR       → atomic + Conventional + Squash
```
❗ phase plan에서 바로 실행 금지 · skeleton에서 바로 코딩 금지 · **plan의 line number 신뢰 금지(매번 grep 재확인)**.

### 계층 3 — 산출물 (문서 컨벤션)
| 산출물 | 위치/규칙 | 용도 |
|--------|-----------|------|
| Master roadmap | `docs/work-plans/work-plan-next-steps.md` | Phase 0~N 인덱스 (SSoT) |
| Phase plan | `docs/work-plans/<phase>-plan.md` | phase 거시 계획 |
| Task plan | `docs/work-plans/<phase>-tasks/t<N>-*.md` | 9섹션 양식 (목표·왜·영향파일·AC·검증·롤백) |
| ADR | `docs/adr/adr-###-kebab.md` | Context·Options·Decision·Consequences·재평가 트리거 |
| Handoff | `docs/work-plans/handoff/YYYY-MM-DD-*.md` | 세션 종료 인계 (완료요약+다음작업경위+선결+시작절차) |

### 계층 4 — 자동화 (`.claude/`)
| 메커니즘 | 동작 |
|----------|------|
| `UserPromptSubmit` hook | 사용자가 `handoff` 입력 → `handoff-trigger.ps1` → memory-writer가 session.md 갱신 |
| `SessionEnd` hook | 미실행 시 안전망 알림 |
| `.claude/rules/session.md` | "북극성 골" + "지금 작업"(goal+DoD+선결) — Claude 자동 로드, ~25줄, **시점 변환 룰**(작성자→독자 관점, "이번/다음 세션" 금지) |
| `.claude/settings.local.json` | 권한 allowlist (반복 프롬프트 제거) |

### 계층 5 — 검증 (게이트 + CI)
- **CI** (`.github/workflows/ci.yml`): 2-job (api·web) + e2e. Postgres 서비스 컨테이너 띄우고 `prisma db push` → **실제 DB 통합테스트** 실행. tsc·lint·unit·playwright 모두 exit 0 강제.
- **verify-*.ps1**: plan/실행을 Claude에 보내 `APPROVED|REJECTED` 적대 판정 (자가 승인 불가).
- **테스트 정책**: 테스트는 구현과 **같은 commit**. Vitest+Testing Library+Playwright+MSW.
- **Docker**: 3-stage multi-stage, Next.js `standalone` 출력, non-root, HEALTHCHECK.

---

## 2. potata 현황 대비 갭 분석

| 계층 | BLF AX | potata 현재 | 갭 |
|------|--------|-------------|-----|
| 원칙 SSoT | `AGENTS.md` (180줄, 12섹션) | ❌ 없음 (전역 룰만) | **크다** |
| 절차 | workflow.md 5단계 + guide | △ OMO 스킬 보유, 문서화 안 됨 | 중간 |
| Master roadmap | work-plan-next-steps.md | ❌ 없음 (산발적 docs) | 중간 |
| ADR | 16개, 표준 양식 | ❌ 없음 (대형 결정 미기록) | 중간 |
| session/handoff | hook + session.md + handoff/ | ❌ 없음 | 중간 |
| CI | 2-job + e2e + DB 통합 | ❌ **없음** | **크다** |
| 테스트 | vitest+playwright+msw | ❌ **0개** | **크다** |
| 권한 allowlist | settings.local.json | ❌ 없음 | 작다 |
| Docker/배포 | multi-stage standalone | ❌ 없음 (deploy 스킬 보유) | 배포 시점 |

potata가 이미 가진 것: `docs/style-analysis.md`, `docs/work-plans/supabase-prisma-nextauth-setup.md`, `.agent/workflows/develop-premium-feature.md`, `.openclaw/` — **조각은 있으나 SSoT·자동화·검증이 부재**.

---

## 3. 🎯 핵심 통찰 — 이 워크플로우는 potata의 인증 버그를 막았을 것

방금 potata에서 발견한 버그: **PR #10이 "Supabase/Prisma/NextAuth 통합" 머지됐으나, signup/verify가 `prisma.user.create()`를 호출하지 않아 어떤 유저도 로그인 불가.** [verify/route.ts:79](../app/api/auth/verify/route.ts#L79)는 `"User verified and created"`를 로그하면서 실제로는 생성하지 않음.

BLF AX 워크플로우의 **3개 장치가 각각 독립적으로** 이를 잡았을 것:

| 장치 | 어떻게 잡았나 |
|------|--------------|
| **Alex #6 No Silent Fallback** | 로그가 "created"라고 보고해도 신뢰 금지 → DB row 직접 확인 의무. 거짓 자기보고가 곧바로 적발됨. |
| **CI DB 통합테스트** | `ci.yml`처럼 Postgres 컨테이너 + `prisma db push` 후 "signup→verify→`User` row 존재→login 성공" 테스트 1개면 PR #10 머지가 **CI에서 차단**됨. |
| **Alex #3 Consistency** | `package.json`(bcrypt) ↔ 코드(signup은 SHA256) 불일치를 불변식 위반으로 검출. login(bcrypt)과 signup(SHA256) 해시 mismatch도 동일. |

→ **결론: potata에 가장 시급한 도입은 "검증 계층"(테스트+CI)이다.** 문서·세션 시스템보다 버그 차단 ROI가 압도적이다.

---

## 4. 적용 권고 (우선순위별, right-sized)

> 원칙: potata는 BLF AX보다 작고 1인 개발 단계. **전부 복사 = 과잉(Karpathy 위반).** 아래는 선별·축소판이다.

### 🔴 P0 — 검증 계층 (지금, 인증 버그 직결)
1. **vitest 도입 + 인증 플로우 통합테스트 1개**
   - `npm i -D vitest @testing-library/react jsdom` + `vitest.config.ts` + `npm run test` 스크립트.
   - 첫 테스트: signup→verify 후 `prisma.user.findUnique`로 row 존재 + login authorize 성공 확인. → **이 테스트가 빨개야 정상**(현재 버그 상태 증명) → P0 인증 수정의 DoD가 됨.
2. **최소 CI** (`.github/workflows/ci.yml`)
   - 축소판: 단일 job — `tsc --noEmit` + `lint` + `test`. (BLF의 2-job/e2e/Postgres 컨테이너는 아직 불필요. 단, 인증 통합테스트가 DB를 타면 Postgres 서비스 컨테이너 추가.)

### 🟠 P1 — 원칙 SSoT (싸고 효과 큼)
3. **`AGENTS.md` 작성** (~80줄, BLF 180줄의 축소판)
   - 섹션만 차용: Stack · Commands · **Boundaries(Allowed/Ask First/Forbidden)** · Anti-Patterns · Git Policy.
   - potata 특화 Forbidden 예: `.env*` commit 금지, main 직접 commit 금지, signup/login 해시 알고리즘 불일치 금지, dummy.ts 의존 영구화 금지.
   - `CLAUDE.md`는 `@AGENTS.md` import 한 줄 + Claude 전용 노트만.
4. **권한 allowlist** — `/fewer-permission-prompts` 스킬로 자동 생성(반복 승인 제거). 저비용.

### 🟡 P2 — 산출물/연속성 (작업량 늘면)
5. **Master roadmap 1개** — `docs/work-plans/roadmap.md`에 P0~P3(인증·try-on 보안·UX·카탈로그 DB화) 인덱스. 산발 docs 통합.
6. **ADR 2~3개만** — 이미 내린 대형 결정 소급 기록: ADR-001 Supabase+Prisma+NextAuth 선택, ADR-002 인메모리→DB 인증저장소 전환, ADR-003 Replicate try-on. (16개 강요 금지, 큰 결정만.)
7. **session.md (경량)** — `.claude/rules/session.md`에 "지금 작업" goal+DoD ~20줄. handoff hook은 선택(BLF의 `handoff-trigger.ps1` 패턴 차용 가능하나 1인 단계엔 수동으로 충분).

### ⚪ P3 — 배포/확장 시점 (지금은 보류 = 과잉)
- verify-*.ps1 적대 게이트 → potata는 기존 OMO 스킬(`/plan`+momus)로 대체.
- Docker multi-stage `standalone` → potata `deploy` 스킬(Plesk/Docker) 사용 시점에.
- 멀티엔진(.cursor/.codex import) → Cursor를 potata에 쓸 때만.
- e2e Playwright → 핵심 user flow(로그인·장바구니) 안정화 후.

---

## 5. 즉시 실행 가능한 첫 스텝 (제안)

```
1. vitest 셋업 + 인증 통합테스트 작성 (현재 버그로 RED)   → verify: npm run test 가 fail
2. P0 인증 배선 수정 (signup bcrypt + verify user.create)  → verify: 위 테스트 GREEN
3. .github/workflows/ci.yml 최소 CI 추가                    → verify: PR에서 tsc+lint+test 통과
4. AGENTS.md 작성 (Boundaries 중심)                          → verify: 다음 작업이 룰 위반 0
```

> 1~2는 묶여 있다 — **테스트가 인증 수정의 DoD**가 되므로(BLF "테스트는 구현과 같은 commit" 정책). 이것만으로 potata 워크플로우 성숙도가 BLF의 검증 계층 핵심에 도달한다.

---

## 부록 — 차용 가능한 BLF 템플릿 경로
- 절차: `BLF AX/blf-dashboard/docs/workflow.md`, `docs/task-plan-guide.md`
- 세션: `docs/session-system.md`, `.claude/rules/session.md`, `.claude/scripts/handoff-trigger.ps1`
- CI: `.github/workflows/ci.yml` (Postgres 서비스 컨테이너 패턴)
- 원칙: `AGENTS.md` (§0 Alex 7, §5 Boundaries, §8 Anti-Patterns)
- ADR: `docs/adr/adr-016-*.md` (Nygard 양식)
