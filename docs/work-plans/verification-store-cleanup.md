# Work Plan: verification-store Dead Code 정리 + crypto 보안 수정

## Overview
- **Objective**: dead code인 `lib/verification-store.ts` 삭제, `lib/auth.ts`의 `generateVerificationCode()` 보안 수정 (Math.random -> crypto.randomInt), work-plan Phase 상태 업데이트
- **Branch**: `fix/verification-store-cleanup`
- **Scope**:
  - **IN**: dead code 삭제, crypto 보안 수정, work-plan 문서 업데이트
  - **OUT**: Repository pattern 도입 (YAGNI), API 라우트 변경, 새로운 기능 추가

## Background

Metis 분석 결과: `lib/verification-store.ts`는 **0 imports**의 dead code.
API 라우트 3개(signup, verify, resend)가 이미 Prisma를 직접 사용 중이며,
`lib/auth.ts`의 유틸 함수들을 import하고 있음. verification-store는 누구도 참조하지 않음.

단, `lib/auth.ts`의 `generateVerificationCode()`가 `Math.random()`을 사용 중인데,
삭제 대상인 verification-store.ts의 `generateCode()`는 `crypto.randomInt()`를 올바르게 사용.
보안을 위해 `Math.random()`을 `crypto.randomInt()`로 교체 필요.

## Prerequisites
- [x] 현재 코드 분석 완료
- [x] verification-store.ts가 0 imports임을 확인 (grep 검증 완료)

---

## TODOs

### Phase 1: Dead Code 삭제 `category:quick`

- [ ] `lib/verification-store.ts` 파일 삭제 (81줄, 0 imports, 완전한 dead code)

### Phase 2: 보안 수정 `category:quick`

- [ ] `lib/auth.ts`의 `generateVerificationCode()` 수정
  - 변경 전: `Math.floor(100000 + Math.random() * 900000).toString()`
  - 변경 후: `import { randomInt } from "node:crypto";` 추가 + `randomInt(100000, 1000000).toString()`
  - 근거: `Math.random()`은 cryptographically secure하지 않음. 인증 코드 생성에 부적합.

### Phase 3: Work Plan 문서 업데이트 `category:quick`

- [ ] `docs/work-plans/supabase-prisma-nextauth-setup.md` Phase 1-4 TODO를 `[x]`로 변경
  - Phase 1 (패키지 설치): 이미 완료됨
  - Phase 2 (Prisma 설정): 이미 완료됨
  - Phase 3 (verification-store 재작성): 스킵됨 (API 라우트가 직접 Prisma 사용하는 방식으로 해결)
  - Phase 4 (API 라우트 수정): 이미 완료됨
  - Phase 3 설명에 NOTE 추가: "verification-store.ts는 재작성 대신 삭제됨. API 라우트가 Prisma를 직접 사용하므로 중간 레이어 불필요."

### Phase 4: 빌드 검증 `category:quick`

- [ ] `npx tsc --noEmit` 또는 `npm run build`로 TypeScript 에러 없음 확인
- [ ] 삭제한 파일을 참조하는 import가 없는지 최종 grep 확인

---

## Test Strategy
- [ ] `grep -r "verification-store" --include="*.ts" --include="*.tsx" src/ lib/ app/` 결과가 0건
- [ ] TypeScript 빌드 성공 확인

## Success Criteria
- [ ] `lib/verification-store.ts` 파일이 존재하지 않음
- [ ] `lib/auth.ts`의 `generateVerificationCode()`가 `crypto.randomInt()` 사용
- [ ] `npm run build` 에러 없음
- [ ] work-plan 문서의 Phase 상태가 현실과 일치
