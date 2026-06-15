# ADR-002 — 비밀번호 해시 알고리즘 bcrypt 통일

## Status

Accepted — origin/main에서 구현 완료

## Date

2026-06-15

## Context

potata 인증 경로의 비밀번호 해시 알고리즘이 과거 stale 브랜치에서 불일치한 상태가 있었다:

- **구 stale 브랜치** `app/api/auth/signup/route.ts` — `crypto.createHash("sha256")`로 해시 후 저장.
- **auth.ts** (NextAuth authorize) — `bcryptjs.compare(password, passwordHash)`로 검증.

결과: signup 시 sha256 해시가 저장되고 login 시 bcrypt로 비교하므로 어떤 유저도 로그인이 불가능한 P0 버그. 이 불일치는 origin/main에서 이미 해소되었다.

추가 보안 배경:
- SHA-256은 비밀번호 해시에 부적합 — salt 없음, 고속 연산 가능(무차별 대입 취약).
- bcrypt는 adaptive cost(rounds), 자동 salt를 내장하여 비밀번호 해싱 표준으로 사용된다.
- `bcryptjs` 패키지가 `package.json` dependencies에 포함되어 있다.

## Options Considered

| 옵션 | 장점 | 단점 |
|------|------|------|
| **A. sha256 유지, login도 sha256으로 변경** | 변경 파일 최소화 | 보안 취약 (salt 없음, 고속 공격 가능), 표준에서 벗어남 |
| **B. bcrypt 통일 (채택)** | 보안 표준 준수, bcryptjs 이미 설치됨, login/authorize와 일관성 | signup 수정 필요 (1개 파일) |
| **C. Argon2 도입** | 최신 표준, 더 강력 | 신규 패키지 추가, 현 단계 과잉 |

## Decision

**옵션 B — bcrypt(cost 10)로 전 경로 통일** 채택. 구현됨(기록).

- 이유 1: `bcryptjs`가 이미 설치되어 있어 추가 의존성 불필요.
- 이유 2: `auth.ts`(NextAuth authorize)는 이미 `bcrypt.compare`를 사용 중 — signup만 맞추면 일관성 달성.
- 이유 3: rounds(cost) 10은 적정 보안 — 브루트포스 충분히 방어, UX 허용 범위.
- 이유 4: sha256은 비밀번호 해시 용도로 OWASP 권장 알고리즘이 아님.

구현 결과 (origin/main 기준):
- `app/api/auth/signup/route.ts`: `bcrypt.hash(password, 10)` 사용.
- `auth.ts` (NextAuth authorize): `bcrypt.compare(password, passwordHash)` 사용.
- `crypto.createHash("sha256")` 코드: 현 main에 존재하지 않음 (stale 브랜치 잔재 정리 완료).

## Consequences

- **긍정**: signup→login 경로 해시 일관성 달성. P0 로그인 영구 실패 버그 해소.
- **기존 사용자 마이그레이션**: **불필요**. 현 시스템은 신규 개발 단계이며 sha256 해시로 저장된 User row가 존재하지 않는다 — 불일치 버그로 verify 단계에서 User row가 생성된 적 없음.
- **향후 알고리즘 변경 시**: 기존 유저 row의 `passwordHash` 마이그레이션 필요. 이를 방지하기 위해 CLAUDE.md Forbidden에 "해시 알고리즘 불일치(sha256↔bcrypt) 금지" 명시됨.
- **비용**: bcrypt는 sha256보다 연산 비용이 높다. cost 10 기준 적정 ms/hash — 가입 시 1회만 발생하므로 UX 영향 미미.
