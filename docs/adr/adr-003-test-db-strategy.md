# ADR-003 — 테스트 DB 전략 (하이브리드: 단위 mock + 통합 실 Postgres)

## Status

Accepted

## Date

2026-06-15

## Context

potata는 현재 테스트가 전무하다 (`.test` 파일 0개, CI 없음). P0 인증 버그 수정(blf-workflow-adoption.md PR#2)을 기점으로 테스트를 도입하는데, 이때 DB 사용 전략을 결정해야 한다.

인증 라우트(signup/verify/authorize)는 Prisma를 통해 Postgres DB에 직접 의존하므로, 테스트에서 DB를 어떻게 다룰지는 속도·신뢰성·설정 복잡도에 영향을 미친다.

도입 테스트 프레임워크: Vitest + @testing-library/react (이미 설치 완료).

## Options Considered

| 옵션 | 장점 | 단점 |
|------|------|------|
| **A. 전부 mock** | 빠름, DB 불필요, 격리됨 | 실제 DB 배선(prisma.user.create 등) 미검증 — P0 버그 같은 배선 오류를 잡지 못함 |
| **B. 전부 실 DB** | 배선 완전 검증 | 느림, 로컬 Postgres 필수, 테스트 격리 어려움, CI 환경 설정 복잡 |
| **C. 하이브리드 (채택)** | 단위(빠름·격리) + 통합(배선 검증) 균형 | 두 가지 패턴 관리 필요 |

## Decision

**옵션 C — 하이브리드** 채택.

- **단위테스트**: `vi.mock("@/lib/prisma")`로 Prisma client mock. signup·verify·authorize 각각 독립 실행, 빠르고 DB 불필요. 해시 형식, 호출 횟수, 응답 형식 검증.
- **통합테스트**: 1개만. `signup → verify → prisma.user.findUnique → authorize` end-to-end. CI의 `postgres:16-alpine` service container + `prisma db push`로 실제 DB 배선 검증. 이 테스트 1개가 P0 버그(user.create 미호출)를 직접 잡는 안전망.

통합테스트 1개 제한 이유:
- P0 수정 DoD(진짜 DB에 User row 생성 검증)를 달성하는 최소 단위.
- 2개 이상은 CI 시간·유지보수 비용 대비 ROI 불명확 (right-sized 원칙).

CI 구성 (PR#2):
- `.github/workflows/ci.yml`에 `services.postgres` (postgres:16-alpine, `pg_isready` health-cmd) 추가.
- `DATABASE_URL=postgres://postgres:postgres@localhost:5432/potata_test`.
- steps: `prisma db push --skip-generate` → vitest (단위+통합 동시 실행).

## Consequences

- **긍정**:
  - 단위테스트로 빠른 피드백 (mock, DB 불필요).
  - 통합테스트로 실제 배선 검증 — "log만 찍고 create 안 함" 류 silent fallback을 잡음.
  - CI 환경만 실 DB 사용 → 로컬 개발에서 Postgres 필수 아님.
- **제약**:
  - 통합테스트는 CI에서만 완전 실행 가능 (로컬 Postgres 없으면 skip 또는 mock 대체).
  - CI `NEXTAUTH_SECRET`은 더미 값 사용 (프로덕션 secret CI에 미주입).
- **범위 외 (명시적 제외)**:
  - Redis — 현 단계 과잉 (ADR-001 참조).
  - e2e Playwright — UX 안정화 후 P3 단계에서 검토.
  - 커버리지 게이트 — 현 단계 과잉.
  - CI 매트릭스 (다중 node/OS) — 단일 node LTS로 충분.
