# Work Plan: Google OAuth 로그인 추가

> 상태: 설계 확정(사용자 인계). 실행 전 Wave 1의 두 결정 TODO(스키마 nullable·emailVerified 타입)를 반드시 먼저 처리.
> 검증 기준 시점: `feat/auth-google-oauth` 브랜치, `prisma/schema.prisma:11-23`, `auth.ts`, `app/api/auth/*`.

## Overview

- **Objective**: 기존 Credentials(이메일+비밀번호+코드인증) 로그인은 그대로 유지한 채, Google OAuth(Authorization Code) 로그인을 NextAuth v5(JWT 전략)에 추가한다. OAuth로 가입한 유저도 주문/마이페이지 등 기존 인증 경로를 동일하게 사용할 수 있어야 한다.
- **Scope**:
  - **IN**: Google provider 등록, OAuth 유저를 위한 `User` 스키마 마이그레이션(`passwordHash` nullable, `emailVerified` 의미 확정), `auth.ts` Credentials 경로의 nullable 대응, `signIn` 콜백에서 OAuth 유저 DB upsert, 영향받는 인증 라우트 4종 가드 무결성 유지, 통합 테스트 픽스처 마이그레이션 반영, 환경변수(.env.example) 추가.
  - **OUT**: 추가 OAuth provider(Kakao/Naver/Apple), 계정 연동/병합 UI(동일 이메일 credentials+oauth 머지 플로우는 정책만 명시·구현 제외), 비밀번호 재설정, NextAuth DB 세션 전략 전환(JWT 유지), `@auth/prisma-adapter` 도입(JWT라 불필요 — 의도적 제외).
- **Approach**: NextAuth v5 + **JWT 세션 전략 유지**(현 `auth.ts:50` `strategy:"jwt"`). DB 어댑터 없이 `Google` provider를 `providers[]`에 추가하고, `callbacks.signIn`에서 OAuth 프로필을 `prisma.user.upsert`로 직접 동기화한다. 이 방식을 택한 이유: (1) 기존 Credentials 경로가 이미 DB를 수동 관리하며 어댑터를 쓰지 않음 — 어댑터 도입 시 `emailVerified DateTime?` 등 스키마를 표준에 맞춰 광범위 변경해야 하므로 변경 표면이 커진다(Karpathy: surgical changes). (2) JWT 유지 시 세션 테이블 불필요.

## Context

### Project Context (from docs/)

- **Product Goal** (`.claude/rules/session.md` 북극성): potata = 한국→UAE 패션 커머스. 인증·검증계층·커머스 MVP·카탈로그 DB 정착 완료. OAuth 로그인은 "실유저 가동" 확장 트랙의 진입 장벽 완화에 해당.
- **ADR Constraints Applied (DO NOT RE-DECIDE)**:
  - `adr-002-bcrypt-password-hash.md`: 비밀번호 해시는 bcrypt 전용. → OAuth 유저는 비밀번호가 **없음**. bcrypt 정책을 깨지 않으며, "OAuth 유저 = passwordHash null" 로 공존 (Credentials 유저는 그대로 bcrypt).
  - `adr-001-db-verification-store.md`: 이메일 인증은 DB `VerificationCode` 테이블. → OAuth는 Google이 이메일을 이미 검증하므로 `VerificationCode` 플로우를 **타지 않는다**. signup/verify/resend 라우트 로직은 OAuth와 무관하게 유지.
  - `adr-003-test-db-strategy.md`: 통합 테스트는 실 Postgres. → OAuth signIn 콜백 검증은 단위(콜백 함수 직접 호출 + prisma mock) 우선, 실 DB 통합은 선택.
- **Aligned with Existing Plans**: `blf-workflow-adoption.md`, `supabase-prisma-nextauth-setup.md`가 현 인증 인프라를 세움. 본 plan은 그 위에 provider 1개 + 스키마 nullable 확장을 더하는 **독립 증분**이며 기존 plan을 뒤집지 않음.
- **Out-of-Scope Items**: 가짜 user 객체(`user-${Date.now()}`) 복원 금지(CLAUDE.md Forbidden), `createHash("sha256")` 금지, `data/dummy.ts` 신규 의존 금지.

### Interview Summary

확정 설계로 인계됨(인터뷰 생략). 핵심 결정:

- **세션 전략**: JWT 유지(어댑터 미도입). 근거 = 위 Approach.
- **OAuth 유저 식별**: 이메일 기준 upsert. 동일 이메일이 이미 Credentials로 존재하면 동일 `User` 레코드를 사용(자연 연동), 단 자동 비밀번호 설정은 하지 않음.
- **`emailVerified` 의미**: OAuth 유저는 Google이 이메일 소유를 검증 → upsert 시 `emailVerified: true`. (타입은 Wave 1에서 확정: Boolean 유지 권장.)

### Research Findings (verified in codebase)

- `auth.ts:6-69` — NextAuth v5, `providers:[Credentials]`, `strategy:"jwt"`, `callbacks.jwt`/`session`만 존재. **`signIn` 콜백 없음** → 신규 추가 필요.
- `auth.ts:30` `if (!user.emailVerified) return null` — Credentials 전용 가드. OAuth는 이 authorize를 타지 않음(영향 없음).
- `auth.ts:34` `bcrypt.compare(password, user.passwordHash)` — `passwordHash`가 nullable이 되면 **타입 에러 발생**. OAuth 유저(passwordHash null)가 Credentials로 로그인 시도하면 `null` 반환되도록 명시 가드 추가 필요.
- `prisma/schema.prisma:11-23` — `passwordHash String`(non-null), `emailVerified Boolean @default(false)`. 둘 다 OAuth 유저가 채울 수 없는 제약.
- `types/next-auth.d.ts:1-12` — `Session.user`만 augment, **`User`/`JWT` augment 없음**. `image` 필드는 이미 있음.
- `app/api/auth/[...nextauth]/route.ts` — `handlers` 재노출만. OAuth 콜백 URL `/api/auth/callback/google`은 이 핸들러가 자동 처리(라우트 파일 변경 불필요).
- `package.json` — `next-auth ^5.0.0-beta.30` 설치됨. `Google` provider는 `next-auth/providers/google`로 내장(신규 의존성 불필요).
- 프로젝트 테스트: `lib/auth.test.ts`, `app/api/orders/route.test.ts`, `app/api/orders/route.integration.test.ts`, `app/api/try-on/route.test.ts` (vitest).

### emailVerified / passwordHash 영향 지점 (전수 — verified)

| # | 파일:라인 | 현재 코드 | 마이그레이션 영향 |
|---|-----------|----------|------------------|
| 1 | `prisma/schema.prisma:15` | `passwordHash String` | → `String?` (OAuth 유저 null 허용) — **Wave 1 결정** |
| 2 | `prisma/schema.prisma:16` | `emailVerified Boolean @default(false)` | 타입 유지(Boolean) 결정 확정 필요 — **Wave 1 결정** |
| 3 | `auth.ts:30` | `if (!user.emailVerified)` | 의미 동일 유지(Boolean falsy 체크) — Credentials 경로 |
| 4 | `auth.ts:34` | `bcrypt.compare(password, user.passwordHash)` | `passwordHash` nullable → `if (!user.passwordHash) return null` 선행 가드 추가 |
| 5 | `app/api/auth/login/route.ts:28` | `if (!user.emailVerified)` | 동일 유지 + nullable passwordHash 가드(`route.ts:35` compare 앞) |
| 6 | `app/api/auth/signup/route.ts:48,65,71` | `emailVerified` 409/false | OAuth 무관, 변경 없음(회귀 확인만) |
| 7 | `app/api/auth/verify/route.ts:88,94` | `emailVerified:true` | OAuth 무관, 변경 없음(회귀 확인만) |
| 8 | `app/api/auth/resend/route.ts:34` | `user.emailVerified` 게이트 | OAuth 무관, 변경 없음(회귀 확인만) |
| 9 | `app/api/orders/route.integration.test.ts:58-65` | 픽스처 `passwordHash:"x", emailVerified:true` | passwordHash nullable 후에도 명시값 유효 — **마이그레이션 회귀 확인 대상**(F-wave에서 통합 테스트 통과 확인) |

> 주의: "5곳"은 emailVerified 직접 게이트(2~3,5,6~8 중 게이트성)이고, "+2곳"은 passwordHash nullable 파생(4,5의 compare 가드)이다. 9번 통합 테스트 픽스처는 회귀 검증 대상으로 별도 명시.

### Metis Review

**Identified Gaps** (plan에 반영됨):

- **Gap: passwordHash non-null이 OAuth의 진짜 블로커** → Wave 1 스키마 결정 TODO로 격상. emailVerified만 보면 누락됨.
- **Gap: 동일 이메일 Credentials+OAuth 충돌** → upsert(by email) 정책으로 명시, 자동 비번 설정 금지. 계정 병합 UI는 OUT.
- **Gap: OAuth 유저가 Credentials 로그인 시도** → `auth.ts`/`login` 라우트에 `!passwordHash → null/401` 가드 추가(QA negative 시나리오로 검증).
- **Missing acceptance criteria**: OAuth signIn 콜백이 신규/기존 유저 모두 멱등 upsert. `npx tsc --noEmit` 통과(nullable 전파). 기존 통합 테스트 4종 그린 유지.

## Prerequisites

- [ ] Google Cloud Console OAuth 2.0 Client ID/Secret 발급(인간 작업 — Authorized redirect URI: `http://localhost:3000/api/auth/callback/google` + 운영 도메인). 발급 전 코드 작업은 진행 가능, 실제 OAuth 플로우 E2E는 자격증명 필요.
- [ ] `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET` 환경변수 확보(.env.local, commit 금지).

---

## TODOs

### Wave 1 (병렬 — 공유 의존성·결정 먼저)

- [ ] 1. `User` 스키마 nullable 마이그레이션 결정·적용 `category:ultrabrain`
- [ ] 2. `emailVerified` 타입 결정 문서화(ADR 보강) `category:ultrabrain`
- [ ] 3. NextAuth 타입 augment 확장(`types/next-auth.d.ts`) `category:quick`
- [ ] 4. `.env.example` OAuth 환경변수 추가 `category:quick`

### Wave 2 (Wave 1 완료 후 — 병렬)

- [ ] 5. `auth.ts` Google provider 등록 `category:ultrabrain`
- [ ] 6. `auth.ts` Credentials 경로 nullable passwordHash 가드 `category:ultrabrain`
- [ ] 7. `app/api/auth/login/route.ts` nullable passwordHash 가드 `category:quick`
- [ ] 8. `signIn` 콜백 OAuth 유저 upsert 구현 `category:ultrabrain`

### Wave 3 (Wave 2 완료 후 — 병렬)

- [ ] 9. OAuth signIn 콜백 단위 테스트 작성 `category:ultrabrain`
- [ ] 10. 통합 테스트 픽스처 회귀 확인·보정 `category:writing`

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|-----------|--------|
| 1 | None | 스키마 nullable이 모든 후속 타입의 전제 |
| 2 | None | 독립 결정·문서 |
| 3 | None | 타입 선언 파일, 코드 무관 |
| 4 | None | 설정 파일, 독립 |
| 5 | 1, 3 | provider 추가 시 User/JWT 타입 필요 |
| 6 | 1 | nullable passwordHash 타입 의존 |
| 7 | 1 | nullable passwordHash 타입 의존 |
| 8 | 1, 5 | upsert가 nullable 컬럼·provider 콜백 컨텍스트 의존 |
| 9 | 8 | 대상 콜백 구현 필요 |
| 10 | 1 | 마이그레이션 후 픽스처 회귀 확인 |

---

## Parallel Execution Graph

```
Wave 1 (즉시 시작, 병렬):
├── Task 1: User 스키마 nullable 결정·적용
├── Task 2: emailVerified 타입 ADR
├── Task 3: next-auth.d.ts augment
└── Task 4: .env.example

Wave 2 (Wave 1 완료 후, 병렬):
├── Task 5: Google provider 등록
├── Task 6: auth.ts nullable 가드
├── Task 7: login route nullable 가드
└── Task 8: signIn 콜백 upsert

Wave 3 (Wave 2 완료 후, 병렬):
├── Task 9: signIn 콜백 단위 테스트
└── Task 10: 통합 테스트 픽스처 회귀

Critical Path: Task 1 → Task 8 → Task 9
```

---

## Category + Skills

| Task | Category | Category Reason | Skills Omitted (Why) |
|------|----------|-----------------|----------------------|
| 1 | ultrabrain | DB 스키마 변경 + nullable 파급 분석 | frontend-ui-ux: no UI |
| 2 | ultrabrain | 아키텍처 결정 문서(ADR) | - |
| 3 | quick | 타입 선언 한 파일, 로직 없음 | - |
| 4 | quick | 설정 파일 1개 | - |
| 5 | ultrabrain | NextAuth provider + JWT 콜백 상호작용 | - |
| 6 | ultrabrain | 인증 분기 로직, 보안 민감 | - |
| 7 | quick | 단일 가드 절 추가 | - |
| 8 | ultrabrain | OAuth↔DB 동기화, 멱등성·충돌 정책 | - |
| 9 | ultrabrain | 인증 콜백 테스트 설계 | - |
| 10 | writing | 기존 테스트 회귀 확인·주석 | - |

---

## Task Detail

- [ ] 1. `User` 스키마 nullable 마이그레이션 결정·적용 `category:ultrabrain`
  **Goal**: `prisma/schema.prisma:15` `passwordHash String` → `String?`. `npx prisma generate` + `npx prisma db push`(dev) 성공. 기존 Credentials 유저 데이터 무손실(nullable 완화는 데이터 손실 없음).
  **References**:
  - `prisma/schema.prisma:11-23` — `User` 모델 정의. `passwordHash`만 nullable로, 나머지 필드 불변.
  - `docs/adr/adr-002-bcrypt-password-hash.md` — bcrypt 정책 위반 아님 확인(OAuth는 해시 자체가 없음).
  - CLAUDE.md "Ask First": Prisma schema 변경은 승인 대상 — 본 plan 인계로 승인된 것으로 간주, 실행자는 push 전 diff 확인.
  **Must NOT do**: `emailVerified`를 `DateTime?`로 바꾸지 말 것(Task 2에서 Boolean 유지 결정). 새 컬럼(`provider`, `image` 등) 추가하지 말 것 — `image`는 `avatar`로 매핑(아래 Task 8). 어댑터용 `Account`/`Session` 테이블 추가 금지(JWT 전략).
  **QA Scenarios**:
  - Happy path: `npx prisma generate` 후 `npx tsc --noEmit` 실행 — `passwordHash`가 `string | null`로 추론되어 `auth.ts:34`에서 타입 에러가 노출됨(=Task 6가 처리할 신호). 에러 위치가 정확히 `auth.ts`·`login/route.ts`의 compare 호출부인지 확인.
  - Edge case: `npx prisma db push` 후 기존 유저 행 `SELECT count(*) FROM "User" WHERE "passwordHash" IS NULL` = 0 (완화 마이그레이션은 기존값 보존).
  - Negative: 마이그레이션이 데이터 삭제(DROP/재생성) 프롬프트를 띄우면 중단 — nullable 완화는 파괴적 변경이 아니어야 함.

- [ ] 2. `emailVerified` 타입 결정 문서화(ADR 보강) `category:ultrabrain`
  **Goal**: `emailVerified Boolean @default(false)` 유지를 ADR로 명문화. 새 ADR `docs/adr/adr-006-oauth-jwt-no-adapter.md` 생성 — 결정: (a) JWT 전략 유지, 어댑터 미도입 (b) emailVerified는 Boolean 유지(OAuth=true) (c) passwordHash nullable로 OAuth 공존.
  **References**:
  - `docs/adr/adr-001-db-verification-store.md` — 형식·번호 규칙 참고(006이 다음 번호).
  - `auth.ts:30`, `login/route.ts:28`, `resend/route.ts:34` — Boolean falsy 게이트가 의미 변경 없이 유지됨을 ADR에 근거로 기재.
  **Must NOT do**: 어댑터(`@auth/prisma-adapter`) 도입을 권하는 내용 작성 금지(OUT of scope). emailVerified를 nullable DateTime으로 바꾸는 대안을 "채택"으로 쓰지 말 것(기각 대안으로만 기록).
  **QA Scenarios**:
  - Happy path: ADR 파일에 Status/Context/Decision/Consequences 섹션 존재, 기각 대안(어댑터+DateTime) 명시.
  - Edge case: 기존 ADR 001~005와 번호·파일명 규칙 일치(`adr-00N-kebab.md`).
  - Negative: ADR이 settled된 bcrypt(002)·verification(001) 결정을 재논의하지 않음.

- [ ] 3. NextAuth 타입 augment 확장 `category:quick`
  **Goal**: `types/next-auth.d.ts`에 `JWT` 토큰 `id` augment 추가(`auth.ts:58` `token.id` 사용처 타입 안전). `Session.user`는 현행 유지. OAuth로 들어온 `profile`/`user` 객체의 `image` 매핑이 타입 충돌 없도록 확인.
  **References**:
  - `types/next-auth.d.ts:1-12` — 현재 `Session`만 augment. `declare module "next-auth/jwt"` 블록 추가.
  - `auth.ts:55-67` — `jwt`/`session` 콜백에서 `token.id` 읽기/쓰기. 현재 `token.id as string` 캐스팅 → augment 후 캐스팅 불필요 여부 확인(단, 캐스팅 제거는 surgical 범위 — 타입 에러 없으면 그대로 두기).
  **Must NOT do**: `Session.user`에 OAuth 전용 필드(provider 등) 추가 금지(불필요). 기존 `image?: string | null` 시그니처 변경 금지.
  **QA Scenarios**:
  - Happy path: `npx tsc --noEmit` 통과. `token.id` 사용처에서 타입 인식.
  - Edge case: `next-auth/jwt` 모듈 augment가 `next-auth` augment와 충돌 없이 병존.
  - Negative: augment 추가로 기존 `Session.user.id` 사용처(`orders/route.ts` 등)가 깨지지 않음.

- [ ] 4. `.env.example` OAuth 환경변수 추가 `category:quick`
  **Goal**: `.env.example`에 `AUTH_GOOGLE_ID=`, `AUTH_GOOGLE_SECRET=`, `AUTH_SECRET=`(이미 있으면 유지) placeholder + 1줄 주석 추가. 실제 값은 절대 기입 금지.
  **References**:
  - 기존 `.env.example` 구조(없으면 생성하되 기존 env 키 컨벤션 따름).
  - CLAUDE.md Forbidden: `.env*` commit 금지 — `.env.example`은 placeholder 전용이므로 허용.
  **Must NOT do**: `.env.local`에 실제 시크릿을 commit하지 말 것. 실제 Client ID/Secret 값을 example에 넣지 말 것.
  **QA Scenarios**:
  - Happy path: `git diff .env.example`에 placeholder 3줄만, 실제 값 없음.
  - Edge case: `AUTH_SECRET`이 이미 존재하면 중복 추가하지 않음.
  - Negative: `.env.local`이 git staged에 포함되지 않음(`git status` 확인).

- [ ] 5. `auth.ts` Google provider 등록 `category:ultrabrain`
  **Goal**: `auth.ts` `providers` 배열에 `Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })` 추가(또는 NextAuth v5 자동 env 감지 사용 시 인자 생략). `import Google from "next-auth/providers/google"`. Credentials provider는 그대로 유지.
  **References**:
  - `auth.ts:1-48` — `import Credentials`, `providers:[Credentials({...})]`. Google import를 line 2 부근에 추가, providers 배열에 두 번째 요소로 추가.
  - `package.json:24` — `next-auth ^5.0.0-beta.30` 내장 provider 사용(신규 의존성 없음).
  - `app/api/auth/[...nextauth]/route.ts` — 콜백 URL 자동 처리, 변경 불필요.
  **Must NOT do**: `strategy:"jwt"`(`auth.ts:50`)를 `database`로 바꾸지 말 것. 어댑터 추가 금지. Credentials provider 제거/수정 금지(이 Task 범위 아님).
  **QA Scenarios**:
  - Happy path: `npm run dev` 후 `GET /api/auth/providers` 응답에 `google`+`credentials` 둘 다 존재. `npx tsc --noEmit` 통과.
  - Edge case: env 미설정 상태에서도 빌드(`npm run build`)는 통과(런타임 OAuth만 실패).
  - Negative: Credentials 로그인 기존 동작이 깨지지 않음(login 페이지 정상).

- [ ] 6. `auth.ts` Credentials 경로 nullable passwordHash 가드 `category:ultrabrain`
  **Goal**: `auth.ts:34` `bcrypt.compare(password, user.passwordHash)` 앞에 `if (!user.passwordHash) return null;` 가드 추가. OAuth로만 가입한 유저(passwordHash null)가 Credentials 폼으로 로그인 시도 시 `null` 반환(401 유도).
  **References**:
  - `auth.ts:22-46` — `authorize` 함수. `user` 조회(line 22) → emailVerified 가드(30) → **passwordHash null 가드 신규(34 앞)** → compare(34).
  - Task 1 산출물(`passwordHash: string | null`).
  **Must NOT do**: emailVerified 가드(line 30) 로직 변경 금지. 자동으로 passwordHash를 설정하거나 OAuth 유저에게 비밀번호 부여 금지(adr-002·계정병합 OUT). 가짜 user 객체 생성 금지(CLAUDE.md Forbidden).
  **QA Scenarios**:
  - Happy path: Credentials 유저(passwordHash 존재) 로그인 — 기존대로 성공.
  - Edge case: passwordHash null 유저 + 임의 비밀번호 — `authorize`가 `null` 반환(로그인 거부).
  - Negative: passwordHash null인데 `bcrypt.compare(password, null)` 가 호출되어 throw 되는 일이 없어야 함(가드가 선행).

- [ ] 7. `app/api/auth/login/route.ts` nullable passwordHash 가드 `category:quick`
  **Goal**: `login/route.ts:35` `bcrypt.compare(password, user.passwordHash)` 앞에 passwordHash null 가드 추가 — null이면 401 `"이메일 또는 비밀번호가 올바르지 않습니다."`(기존 메시지 재사용, 정보 노출 최소화).
  **References**:
  - `app/api/auth/login/route.ts:28-42` — emailVerified 가드(28) → **passwordHash null 가드 신규(35 앞)** → compare(35).
  - Task 6과 동일 패턴(일관성). 단 이 라우트는 사전검증용(`route.ts:44-46` NOTE 참조).
  **Must NOT do**: emailVerified 403 로직 변경 금지. 메시지에 "OAuth 계정입니다" 같은 계정 존재/유형 노출 금지(enumeration 방지).
  **QA Scenarios**:
  - Happy path: 정상 Credentials 유저 — 200 success.
  - Edge case: passwordHash null 유저 — 401, 기존 일반 메시지.
  - Negative: `bcrypt.compare(_, null)` 미호출(가드 선행).

- [ ] 8. `signIn` 콜백 OAuth 유저 upsert 구현 `category:ultrabrain`
  **Goal**: `auth.ts` `callbacks`에 `async signIn({ user, account, profile })` 추가. `account?.provider === "google"`일 때 `prisma.user.upsert({ where:{ email }, update:{ name, emailVerified:true, avatar: image }, create:{ email, name, emailVerified:true, avatar: image } })`로 멱등 동기화 후 `return true`. Credentials provider(`account?.provider === "credentials"`)는 기존 동작 유지(`return true`). 이후 `jwt` 콜백에서 `token.id`가 DB userId가 되도록 보정(upsert 결과 id 사용 — `signIn`에서 직접 token에 못 넣으므로 `jwt` 콜백에서 email로 재조회하거나 `user.id`를 upsert id로 맞추는 방식 중 택1; 실행자는 NextAuth v5 콜백 순서 확인 후 결정).
  **References**:
  - `auth.ts:55-68` — 현재 `callbacks`에 `jwt`/`session`만. `signIn` 신규 추가. `jwt` 콜백(`token.id = user.id`)이 OAuth user의 id를 DB id로 받도록 연계.
  - `prisma/schema.prisma:11-23` — upsert 대상 필드(`email` unique, `name` 필수, `avatar` optional, `emailVerified`). `passwordHash`는 OAuth 시 **미지정**(nullable이므로 가능 — Task 1 의존).
  - `auth.ts:44` — Credentials authorize가 `image: user.avatar` 반환 — OAuth의 `image`(profile.picture)를 `avatar` 컬럼에 매핑하여 일관성 유지.
  **Must NOT do**: OAuth upsert 시 `passwordHash`에 임의값/빈 문자열/해시 넣지 말 것(null 유지). 동일 이메일 기존 Credentials 유저의 `passwordHash`를 덮어쓰지 말 것(update 절에 passwordHash 미포함). 계정 병합 확인 UI 만들지 말 것(OUT). 가짜 id(`user-${Date.now()}`) 금지.
  **QA Scenarios**:
  - Happy path: 신규 Google 유저 첫 로그인 — `User` 행 1개 생성(`emailVerified=true`, `passwordHash=null`, `avatar=<picture>`), `signIn` true.
  - Edge case: 동일 이메일 재로그인 — upsert가 중복 생성 안 함(행 1개 유지), update만 적용, 기존 passwordHash(있으면) 보존.
  - Negative: 동일 이메일 Credentials 유저가 이미 존재할 때 Google 로그인 — 기존 행의 passwordHash가 **null로 덮이지 않음**(update 절에 passwordHash 없음 확인).

- [ ] 9. OAuth signIn 콜백 단위 테스트 작성 `category:ultrabrain`
  **Goal**: `auth.ts`의 `signIn` 콜백을 검증하는 vitest 단위 테스트(`auth.signin.test.ts` 신규, prisma mock). 신규 유저 생성·기존 유저 멱등·passwordHash 비파괴·Credentials provider 패스스루 4 케이스.
  **References**:
  - `app/api/orders/route.integration.test.ts:10-12` — `vi.hoisted` + `vi.mock("@/auth")` 패턴 참고(여기선 `@/lib/prisma` mock).
  - `lib/auth.test.ts` — 프로젝트 vitest 컨벤션(describe/it 한국어).
  - Task 8 산출물(`signIn` 콜백). 콜백이 `auth.ts` 내부 클로저라면 export 가능 형태로 분리 검토(단, surgical — 분리 비용 크면 통합 테스트로 대체하고 그 사유 명시).
  **Must NOT do**: 실 Google OAuth 네트워크 호출 금지(mock). 실 DB 의존 단위 테스트 작성 금지(통합은 별도). 기존 테스트 파일 수정 금지(신규 파일만).
  **QA Scenarios**:
  - Happy path: `npm run test auth.signin` — 4 케이스 전부 pass(exit 0).
  - Edge case: 기존 유저 mock에서 `prisma.user.upsert` update 인자에 `passwordHash` 키가 **부재**함을 단언.
  - Negative: `account.provider==="credentials"`일 때 upsert가 **호출되지 않음**을 `expect(upsertMock).not.toHaveBeenCalled()`로 단언.

- [ ] 10. 통합 테스트 픽스처 회귀 확인·보정 `category:writing`
  **Goal**: `app/api/orders/route.integration.test.ts:58-65` 픽스처(`passwordHash:"x", emailVerified:true`)가 Task 1 마이그레이션(passwordHash nullable) 후에도 그린임을 확인. 명시값 `"x"`는 nullable과 무관하게 유효하므로 코드 변경은 원칙적으로 불필요 — 변경이 필요 없다면 "회귀 확인 완료" 주석/세션 기록만 남기고 픽스처 불변 유지.
  **References**:
  - `app/api/orders/route.integration.test.ts:58-65` — `prisma.user.create` 픽스처. `passwordHash:"x"`(line 62), `emailVerified:true`(line 63).
  - `docs/adr/adr-003-test-db-strategy.md` — 실 Postgres 통합 정책.
  **Must NOT do**: 픽스처에서 `passwordHash`를 제거하지 말 것(create는 명시값이 더 명확 — surgical: 동작하면 그대로). 테스트 어서션 로직 변경 금지(주문 검증과 무관).
  **QA Scenarios**:
  - Happy path: DB 연결 가능 환경에서 `npm run test app/api/orders/route.integration` — 3 테스트 그린.
  - Edge case: 마이그레이션 후 `prisma generate`된 타입으로 `create({ data:{ ..., passwordHash:"x" } })`가 타입 에러 없음(string은 string?에 할당 가능).
  - Negative: 픽스처 변경 없이 통과 시 불필요한 diff를 만들지 않음(`git diff`에 본 파일 변경 0줄이 정상 결과일 수 있음).

---

## Final Verification Wave

- [ ] F1. 타입 무결성: `npx tsc --noEmit` exit 0 (nullable passwordHash 전파 후 모든 사용처 가드됨).
- [ ] F2. Lint: `npm run lint` exit 0.
- [ ] F3. 전체 테스트: `npm run test` — `lib/auth.test.ts`, `app/api/orders/route.test.ts`, `app/api/try-on/route.test.ts`, 신규 `auth.signin.test.ts` 그린. (DB 연결 가능 시 `route.integration.test.ts`도 그린.)
- [ ] F4. Provider 노출: `npm run dev` → `GET /api/auth/providers`에 `google`+`credentials` 동시 존재.
- [ ] F5. OAuth E2E(자격증명 확보 후): Google 로그인 → 콜백 → `User` 행 1개(emailVerified=true, passwordHash=null) → 재로그인 시 중복 0 → 주문 API 인증 통과.
- [ ] F6. 회귀: 기존 Credentials signup→verify→login 플로우 정상(가드 추가가 기존 경로를 깨지 않음). 동일 이메일 Credentials+Google 시 passwordHash 비파괴.
- [ ] F7. 시크릿 안전: `git status`에 `.env.local` 미포함, `.env.example`엔 placeholder만.

## Test Strategy

tests-after (vitest). OAuth signIn 콜백은 prisma mock 단위 테스트(Task 9) 우선, 실 DB 통합·E2E는 자격증명 확보 후 선택(adr-003 준수). 기존 통합 테스트 4종은 마이그레이션 회귀 게이트로 사용.

## Success Criteria

- [ ] Google OAuth 로그인이 동작하고, OAuth 유저가 주문 등 인증 경로를 Credentials 유저와 동일하게 사용 가능.
- [ ] `passwordHash` nullable 마이그레이션 후 `npx tsc --noEmit`/`npm run lint`/`npm run test` 모두 exit 0.
- [ ] OAuth 유저는 `passwordHash=null, emailVerified=true`로 저장되고, Credentials 로그인 시도는 거부됨.
- [ ] 동일 이메일 Credentials 유저의 비밀번호가 OAuth 로그인으로 파괴되지 않음(멱등 upsert, update 절 passwordHash 부재).
- [ ] 기존 인증 4라우트(signup/verify/login/resend) 동작 무회귀.
- [ ] `adr-006` 작성으로 JWT-no-adapter·Boolean emailVerified·nullable passwordHash 결정 문서화.
