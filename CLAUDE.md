# potata CLAUDE.md — 프로젝트 코딩 규칙 SSoT

> `AGENTS.md`는 OMOC 에이전트 페르소나 워크스페이스 파일(별개 관심사). 본 문서는 potata 코드베이스 작업 규칙 SSoT.

---

## Stack

- Next.js 16 (App Router) + React 19, TypeScript strict
- Tailwind CSS v4, Zustand, Framer Motion
- Supabase Postgres + Prisma 6 + NextAuth v5 beta (JWT)
- bcryptjs (비밀번호 해시), Resend (이메일), Replicate (AI try-on)
- Vitest + @testing-library/react + jsdom

## Commands

| 목적 | 명령 |
|------|------|
| 개발 서버 | `npm run dev` |
| 빌드 | `npm run build` |
| 프로덕션 서버 | `npm start` |
| Lint | `npm run lint` |
| 테스트 (1회) | `npm run test` |
| 테스트 (watch) | `npm run test:watch` |
| 타입 검사 | `npx tsc --noEmit` |
| Prisma 클라이언트 재생성 | `npx prisma generate` |
| 신규/CI DB migration 적용 | `npm run db:migrate:deploy` |
| DB migration 상태 확인 | `npm run db:migrate:status` |

## Boundaries

### 🟢 Allowed
- feature branch 생성 + PR 경유 merge
- `npm run test`, `npx tsc --noEmit`, `npm run lint` 실행
- `npx prisma generate`, `npm run db:migrate:deploy` (신규/CI DB 전용)
- `.env.local` 읽기 (수정 가능, commit 금지)
- `docs/`, `docs/adr/`, `.claude/rules/` 문서 편집

### 🟡 Ask First
- Prisma schema 변경 (`prisma/schema.prisma`)
- migration 생성·운영 DB 적용·`migrate resolve` 실행
- `package.json` 의존성 추가/버전 변경
- NextAuth 설정(`auth.ts`) 수정
- `app/api/` 라우트 핸들러 구조 변경
- CI 워크플로우(`.github/workflows/ci.yml`) 변경
- `data/dummy.ts` 의존 새 파일 추가

### 🔴 Forbidden
- `.env*` 파일 commit (절대 금지 — 시크릿 노출)
- `main` 브랜치 직접 commit (hook으로 차단됨)
- 클라이언트 코드에 API 키·시크릿 하드코딩
- `data/dummy.ts` 의존성 영구화 (P3 카탈로그 DB화 전까지 신규 의존 추가 금지)
- signup/login/authorize 해시 알고리즘 불일치 (모두 bcrypt 통일 유지)
- 가짜 user 객체(`user-${Date.now()}`) 코드 복원/추가
- 운영 DB에 baseline `migration.sql` 직접 실행 또는 `prisma db push` 실행

## Anti-Patterns

- `createHash("sha256")` 비밀번호 해시 사용 — bcrypt 전용
- `globalThis` Map 기반 인메모리 verification store — Prisma VerificationCode 테이블 사용
- `prisma.user.create` 없이 verify 성공 응답 반환
- try-catch를 라우트 핸들러 최상위 외에 중첩
- 테스트 없는 P0 인증 경로 변경

## Git Policy

- 브랜치: `feat/xxx`, `fix/xxx` (short-lived, PR 머지 후 삭제)
- PR 제목: Conventional Commits (`type(scope): description`)
- Squash and Merge 기본
- 100줄+ 변경: `/plan` 선행 필수 / 50줄 미만: 바로 실행
- PR 분할 정책 상세: `docs/work-plans/blf-workflow-adoption.md`
- 우선순위 인덱스: `docs/work-plans/roadmap.md`
- 대화 언어: 한국어 (기술 용어는 영어 유지)
