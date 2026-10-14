# 공유 rate limit — 인스턴스 간 공통 요청 제한

> 상태: 승인(2026-10-14, 기본값 memory) · 진행 중 · 작성 2026-10-14 · 브랜치 `feat/shared-rate-limit` · 로드맵 "품질·보안 기준선 — production 공개 전 shared rate limit 적용(release gate)"

## Objective

가입·인증 메일 재발송·로그인·상품 조회수·AI 착용의 요청 제한이 서버 인스턴스 수와 상관없이 하나의 한도로 동작하게 한다.

## Evidence

- `lib/rate-limit.ts` 는 프로세스 메모리 `Map` 기반이다(파일 NOTE: "인스턴스가 여러 개면 인스턴스당 한도"). Vercel 서버리스는 인스턴스가 여러 개라 실제 한도가 배수로 늘어난다.
- 호출 5곳: `app/api/auth/signup`(email·IP) · `app/api/auth/resend`(email·IP) · `lib/auth-providers.ts` 로그인(email) · `app/api/products/[id]/view`(상품·IP) · `app/api/try-on`(user).
- 구현 중 추가 발견: `app/api/users/me/avatar` 에 별도 메모리 `Map` 제한(사용자당 5분 20회)이 있어 같은 공유 저장소로 옮겼다(로드맵이 이 제한을 release gate 로 명시).
- 모든 public table 은 RLS 를 켜야 한다(`20260918120000_enable_rls_public_tables`, `prisma/rls-coverage.test.ts` 가 강제).
- Vercel 빌드는 `next build` 만 실행하고 migration 을 돌리지 않는다. 운영 DB baseline 은 외부 승인 대기(로드맵 7번).

## 설계

1. **테이블** `RateLimitBucket { key, windowStart, count, expiresAt }`, PK `(key, windowStart)`, index `expiresAt`. migration 에 RLS enable 포함. `key` 는 원래 키(이메일·IP 포함)의 서버 비밀값(AUTH_SECRET/NEXTAUTH_SECRET) HMAC-SHA256 hex 만 저장한다(구현 중 추가 — 메모리 저장소와 달리 DB 에 남으므로 개인정보 보관 방지, 비밀값 없는 해시는 사전 대입으로 되돌릴 수 있어 적대 검증 지적으로 HMAC 로 바꿈).
2. **고정 시간창 카운터**: `INSERT … ON CONFLICT (key, windowStart) DO UPDATE SET count = count + 1 RETURNING count` 한 문장으로 원자적으로 센다. `count ≤ limit` 이면 허용. 시간창이 끝나면 자동으로 풀린다. 기존 sliding window 대비 경계에서 최대 2배 burst 가 가능하다(1차 방어선 용도라 허용).
3. **만료 정리**: 인스턴스마다 최대 10분에 한 번 `expiresAt < now` 행을 최대 1000행씩 삭제(await). 1000행을 꽉 채워 지웠으면 다음 호출에서 바로 이어서 지운다(밀린 행이 반드시 줄어든다). 프로젝트 규칙상 중첩 try-catch 를 두지 않으므로 정리 실패도 DB 오류와 같이 throw 한다(DB 장애면 upsert 가 먼저 실패한다).
4. **저장소 선택은 명시적 env** `RATE_LIMIT_STORE=db|memory`.
   - `db`: 공유 DB 카운터. DB 오류는 그대로 throw(fail-closed → 해당 요청 500).
   - `memory` 또는 미설정: 현재 동작 유지. production 에서 미설정이면 최초 1회 `console.warn` 으로 "인스턴스당 한도" 임을 남긴다.
   - 이유: 운영 DB 에 테이블이 생기기 전에 이 코드가 배포돼도 가입·로그인이 깨지지 않게 하고, 운영 DB migration 적용 뒤 env 한 줄로 전환한다.
5. `consumeRateLimit` 은 `Promise<boolean>` 이 되고 호출 5곳은 `await` 한다. 테스트는 `useMemoryRateLimitForTests()` 로 메모리 저장소를 명시적으로 쓴다.

## Success Criteria

1. `RATE_LIMIT_STORE=db` 에서 서로 다른 두 프로세스(별도 store 인스턴스)가 같은 키의 한도를 공유한다 — 확인: 로컬 DB 통합 테스트
2. 같은 키 동시 요청 N 개 중 정확히 limit 개만 허용된다 — 확인: 로컬 DB 통합 테스트
3. 미설정 시 기존 동작과 같고, 기존 route 테스트(429 포함)가 모두 통과한다 — 확인: `npm run test`
4. 새 테이블 RLS 가 켜지고 CI 의 migration·drift 검사가 통과한다 — 확인: `rls-coverage` 테스트 + CI
5. tsc·lint 0 errors — 확인: 직접 실행

## Tasks

- T1 schema + migration(테이블·index·RLS) · 약 25줄 · low
- T2 `lib/rate-limit.ts` 저장소 2종 + env 선택 + 정리 · 약 80줄 · medium
- T3 호출 5곳 `await` · 테스트 5개 파일 저장소 지정 · 약 20줄 · low
- T4 단위 테스트(메모리) + 통합 테스트(DB, `RUN_INTEGRATION=1`) · 약 80줄 · low
- T5 로드맵·`.env.example` 갱신

## 운영 적용 순서 (이 PR 범위 밖, 사용자 승인 필요)

운영 DB 에 migration 적용(로드맵 7번 절차) → Vercel env `RATE_LIMIT_STORE=db` 추가 → 재배포 → 가입·로그인 smoke.

## 결정 필요

- Prisma schema 변경(🟡 Ask First): `RateLimitBucket` 테이블 추가
- 미설정 기본값을 `memory`(권장, 위 이유) 로 둘지

## 적대 검증 기록 (2026-10-14, 1회차 · 렌즈 security·data·logic · 변이 2)

- 확정 결함 0 · 경미 4. 반영 3: 키를 비밀값 HMAC 로(비밀값 없는 SHA-256 은 IP·이메일 사전 대입 가능) · 가입·재발송에서 IP 버킷을 먼저 검사(IP 초과 발신지가 이메일별 행을 계속 만드는 것 차단) · 만료 정리 1000행 상한.
- 미반영 1: DB 오류 메시지가 익명 500 응답 본문에 실린다 — 기존 route 공통 오류 처리(최상위 catch 의 메시지 반환) 문제라 이 작업 범위 밖. 별도 과제.
- 변이에서 이빨 없던 가드: 가입·재발송 IP 한도(await 삭제·한도 20→2000 이 테스트를 통과) → IP 한도 429 테스트 2건 추가. 버킷 prefix 충돌은 테스트가 잡지 못하지만 현재 prefix 간 충돌 없음(렌즈 확인).

## 적대 검증 2회차 (1회차 뒤 바뀐 파일만 · 렌즈 security·data·logic · 변이 2)

- 확정 1(MAJOR, 두 렌즈·검증자 전원 재현): 1회차에 넣은 정리 상한(1000행/10분/인스턴스) 때문에 공격자가 view·login 경로로 그보다 빨리 새 키를 만들면 테이블이 계속 커진다. → 1000행을 꽉 채우면 다음 호출에서 바로 이어서 정리하도록 고침 + 단위 테스트.
- 변이 생존: HMAC 키·메시지 자리 바꿈, secret+key 해시 — 모두 비밀값 없이는 만들 수 없는 키라 목적(사전 대입 차단)은 유지되어 테스트 추가 대상 아님. 비교 연산의 같은 뜻 다른 표기는 정상 GREEN.
- 별도 과제: view·login 키 앞에도 IP 버킷을 두는 방안(대상 밖).

## 적대 검증 3회차 · 종료 (2회차 뒤 바뀐 lib/rate-limit.ts 만)

- 결함 0. 변이 생존 1: 정리 표시(`lastCleanupAt = at`)를 DELETE 뒤로 옮기면 동시 호출이 DELETE 를 겹쳐 띄우는데 테스트가 못 잡음 → 동시 호출 테스트 추가(변이 시 실패 확인). 런타임 코드 변경 0줄.
- 종료 판정: 3회차 런타임 0줄 + 이후 바뀐 파일이 테스트·문서뿐이라 4회차 대상 0건 → 연속 2회차 0줄로 종료(`~/.claude/rules/coding-workflow.md` ①·⑦).
- 남은 미검증: 실제 Postgres 에서의 동작(ON CONFLICT 카운트·동시성, ctid DELETE … LIMIT 반환 행 수). `lib/rate-limit.integration.test.ts` 는 DB 가 없어 아직 실행하지 못함.
