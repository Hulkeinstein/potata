# potata 세션 컨텍스트

> 시점 주의: 작성자 관점 표현 금지. 독자(작업 재개 시점) 관점으로 기술.

---

## 북극성 골

potata = 한국→UAE 패션 커머스. 로그인 등 핵심 플로우 정상화 + BLF 검증 계층(테스트·CI) 정착이 현 단계 최우선.

---

## 지금 작업

**Plan**: `docs/work-plans/blf-workflow-adoption.md`

**Objective**: BLF AX 워크플로우 right-sized 도입 + P0 인증 배선 버그 수정.

**진행 상태**:
- PR#1 (`feat/workflow-infra`): vitest 셋업·최소 CI·AGENTS.md·CLAUDE.md·ADR·roadmap·session.md 작성 중.
- PR#2 (`fix/auth-user-creation`): PR#1 머지 완료 후 진행.

**완료 기준 (DoD)**:
- PR#1: `tsc --noEmit` + `lint` + `test`(smoke) 전부 exit 0, CI job green.
- PR#2: signup→verify→login 통합테스트(실 Postgres) GREEN, DB에 User row 생성 확인.

**선결 조건**:
- PR#1 머지 후 `fix/auth-user-creation` 브랜치에서 PR#2 진행.
- P0 인증 수정 source: `docs/work-plans/supabase-prisma-nextauth-setup.md` Phase 3·4.

---

## 핵심 버그 (P0)

- `app/api/auth/verify/route.ts:73-77` — 가짜 user 반환, `prisma.user.create` 없음 → 모든 유저 로그인 불가.
- `app/api/auth/signup/route.ts:48` — sha256 해시 (login은 bcrypt) → 해시 불일치.
- `lib/verification-store.ts` — sync 인메모리 Map → 서버 재시작 시 코드 유실.
