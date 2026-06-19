# ADR-006 — Google OAuth: JWT 전략 유지 + 어댑터 미도입

## Status

Accepted

## Date

2026-06-19

## Context

기존 이메일+비밀번호(Credentials) 로그인에 더해 Google OAuth 로그인을 추가한다. 현재 인증은 NextAuth v5(`auth.ts`) + Credentials 단일 provider + JWT 세션 + 커스텀 OTP(`VerificationCode` 테이블, ADR-001) + bcrypt(ADR-002) 구조이며, 별도 User 테이블을 수동 관리한다(`@auth/prisma-adapter` 미사용).

Google을 추가하는 데에는 두 갈래가 있다:

1. **PrismaAdapter 도입(표준)** — `@auth/prisma-adapter` + `Account`/`Session`/`VerificationToken` 모델 추가. 어댑터가 OAuth 유저/계정을 표준 스키마로 저장. 단 어댑터 표준에 맞추려면 `User.emailVerified`를 `Boolean → DateTime?`로 바꿔야 하고, 이는 `authorize`·signup·verify·resend·통합 테스트 픽스처 등 여러 코드 지점을 동시 수정하게 만든다.
2. **어댑터 미도입(JWT 수동 동기화)** — GoogleProvider만 추가하고, `callbacks.signIn`에서 OAuth 프로필을 기존 `User` 테이블에 `prisma.user.upsert`로 직접 동기화. 세션은 기존대로 JWT.

## Options Considered

| 옵션 | 장점 | 단점 |
|------|------|------|
| **A. PrismaAdapter 도입** | 업계 표준, OAuth 토큰/계정 정보 저장, 계정연결 어댑터 처리 | `emailVerified Boolean→DateTime?` 등 스키마/코드 변경 표면이 큼, `Account`/`Session`/`VerificationToken` 신규 테이블, 커스텀 OTP(`VerificationCode`)와 의미 중복 |
| **B. 어댑터 미도입 + JWT 수동 upsert (채택)** | 변경 최소(surgical): `passwordHash` nullable 1건 + provider + 콜백, `emailVerified` 타입 불변, 신규 테이블 0, 계정연결을 이메일 기준 upsert로 자연 처리 | OAuth 토큰을 저장하지 않음(현재 불필요), `jwt` 콜백에서 OAuth user.id(Google sub)를 DB user.id로 교정하는 처리 필요 |

## Decision

**옵션 B — 어댑터 미도입, JWT 전략 유지, `signIn` 콜백에서 OAuth 유저 수동 upsert** 채택.

- **세션**: JWT 유지(Credentials는 DB 세션 미지원이라 어차피 JWT 강제).
- **`emailVerified`**: `Boolean` 유지(OAuth 유저는 upsert 시 `true`). DateTime 전환은 어댑터를 쓸 때만 필요하므로 기각.
- **`passwordHash`**: `String → String?`(nullable). OAuth 전용 유저는 비밀번호가 없다. `authorizeCredentials`에 `if (!user.passwordHash) return null` 가드를 추가해 OAuth 유저의 비밀번호 로그인을 차단.
- **계정 연결**: 동일 이메일로 이메일가입 유저가 이미 있으면 `upsert(where:{email})`가 그 레코드를 사용 = 자연 연결. update 절에 `passwordHash`를 포함하지 않아 기존 비밀번호를 보존.
- **id 매핑**: 어댑터가 없으므로 OAuth 로그인 시 `user.id`는 Google의 `sub`다. `jwt` 콜백에서 이메일로 DB 유저를 재조회해 `token.id`를 우리 DB `User.id`로 교정한다(주문/마이페이지가 이 id를 FK로 사용).
- 보조 로직(`authorizeCredentials`/`syncOAuthUser`)은 `lib/auth-providers.ts`로 분리해 단위 테스트한다(P0 인증 경로 테스트 의무, CLAUDE.md).

## Consequences

- **긍정**: 변경 표면 최소(스키마 1컬럼 nullable, 신규 테이블 0). 기존 이메일 로그인·OTP·bcrypt 무영향. 동일 이메일 계정연결이 단순. `emailVerified` 다중 참조 지점을 건드리지 않음.
- **부정/한계**: Google access/refresh token을 저장하지 않음(현재 Google API 호출 요구 없음 → 무방). 추후 OAuth provider가 늘거나 토큰 저장이 필요해지면 그 시점에 PrismaAdapter 도입을 재검토(이 ADR을 대체하는 새 ADR로).
- **마이그레이션**: `passwordHash` nullable 완화는 비파괴적(`prisma db push`, 데이터 손실 없음). 기존 유저 행은 그대로 유효.
- **죽은 코드 정리 동반**: 미사용 `app/api/auth/login/route.ts`(세션 미생성)와 `store/auth-store.ts`(0 import, `guest-user` 가짜 객체) 삭제 — 이중 상태관리 혼선 예방.
- **범위 외**: 추가 OAuth provider(Kakao/Apple 실구현), 비밀번호 재설정, 계정 병합 UI. Apple 버튼은 '준비중' 비활성 처리.
