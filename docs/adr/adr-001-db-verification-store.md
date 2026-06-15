# ADR-001 — 인메모리 verification store → Prisma DB 테이블 전환

## Status

Accepted — origin/main 커밋 #11/#12/2c47833에서 구현 완료 (`docs/work-plans/verification-store-cleanup.md` 참조)

## Date

2026-06-15

## Context

`lib/verification-store.ts`는 `globalThis`에 `Map<string, VerificationEntry>`를 올려 이메일 인증 코드를 인메모리에 저장하는 구현이었다. 이 방식은 다음 문제를 가진다:

1. **서버 재시작 시 코드 유실** — Next.js 개발 서버는 hot-reload 시 `globalThis`가 초기화되어 발급된 인증 코드가 사라진다.
2. **다중 인스턴스 불가** — 수평 확장 또는 Vercel 서버리스 환경에서 인스턴스 간 상태를 공유하지 못한다.
3. **dead code** — `lib/verification-store.ts`는 실제 라우트에서 더 이상 import되지 않아 삭제 대상이었다.

현재 `prisma/schema.prisma`에 `VerificationCode` 모델이 정의되어 있으며, Supabase Postgres가 프로젝트 DB로 확정된 상태다.

## Options Considered

| 옵션 | 장점 | 단점 |
|------|------|------|
| **A. 인메모리 유지** | 변경 없음, 구현 단순 | 재시작 시 코드 유실, 다중 인스턴스 불가, 프로덕션 불적합 |
| **B. Redis 도입** | 빠름, TTL 기본 지원 | 신규 인프라(Redis) 추가, potata 현 단계 과잉 (Supabase 이미 있음) |
| **C. Prisma DB 전환 (채택)** | 기존 Supabase+Prisma 스택 활용, 재시작·다중 인스턴스 안전, 추가 인프라 불필요 | 함수 async화 필요, 호출부 await 추가 |

## Decision

**옵션 C — Prisma `VerificationCode` 테이블 직접 사용** 채택. 구현됨(기록).

- 이유 1: 기존 Supabase+Prisma 스택에 자연스럽게 통합되며 신규 인프라 불필요.
- 이유 2: `prisma/schema.prisma`에 `VerificationCode` 모델이 이미 준비되어 있다.
- 이유 3: Redis는 현 potata 규모(1인, 초기 단계)에서 과잉이다 (right-sized 원칙).
- 이유 4: TTL은 `expiresAt` 컬럼 + 쿼리 필터로 처리 가능하다.

구현 결과 (origin/main 기준):
- `app/api/auth/signup/route.ts`: `bcrypt.hash(password, 10)` + `prisma.$transaction([user.upsert(emailVerified:false), verificationCode.deleteMany, verificationCode.create])`. 중복은 `existingUser?.emailVerified`일 때만 409.
- `app/api/auth/verify/route.ts`: `prisma.verificationCode.findFirst` → 검증 → `prisma.$transaction(user.upsert(emailVerified:true) + verificationCode.deleteMany)`. 실제 User 생성/검증 완료.
- `lib/verification-store.ts`: 삭제됨 (0 imports, dead code 정리).
- API 라우트(signup/verify/resend)가 Prisma `VerificationCode` 테이블 직접 사용.

## Consequences

- **긍정**: 서버 재시작 후에도 인증 코드 유지. 다중 인스턴스 환경 대응 가능. dead code(`lib/verification-store.ts`) 제거로 코드베이스 간소화.
- **마이그레이션**: 기존 인메모리 데이터는 전환 불필요 (인증 코드는 단명 임시 데이터, 유실 무방).
- **참고**: `lib/auth.ts`는 유지됨 — `generateVerificationCode()`(crypto.randomInt), `VERIFICATION_EXPIRY_MS`, `MAX_VERIFICATION_ATTEMPTS`, `VERIFICATION_CODE_LENGTH`, `MIN_PASSWORD_LENGTH`, `normalizeEmail/normalizeName/isValidEmail/extractErrorMessage` export.
