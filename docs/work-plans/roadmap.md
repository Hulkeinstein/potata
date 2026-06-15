# potata Master Roadmap

> 마지막 업데이트: 2026-06-15
> 목적: P0~P3 작업 인덱스. 각 항목의 상세 plan은 링크된 문서 참조.
> 이 파일은 인덱스만 — 상세 plan 작성 금지.

---

## ✅ P0 — 인증 복구 (완료)

**목표**: 로그인 핵심 플로우 정상화.

**완료 내용** (origin/main #11/#12/2c47833에서 해결 — 별도 PR#2 불필요):
- `lib/verification-store.ts` 인메모리 Map 삭제 (dead code 정리)
- `app/api/auth/signup/route.ts`: `bcrypt.hash(password, 10)` + `prisma.$transaction(user.upsert(emailVerified:false) + verificationCode 관리)`
- `app/api/auth/verify/route.ts`: `prisma.verificationCode.findFirst` → 검증 → `prisma.$transaction(user.upsert(emailVerified:true) + verificationCode.deleteMany)`. 실제 User 생성.
- API 라우트가 Prisma `VerificationCode` 테이블 직접 사용

**Near-term 후보**:
- 인증 회귀 통합테스트 (signup→verify→login, 실 Postgres) — CI green 안전망 미비 상태

**관련 문서**:
- 구현 기록: [verification-store-cleanup.md](./verification-store-cleanup.md)
- ADR: [adr-001](../adr/adr-001-db-verification-store.md) · [adr-002](../adr/adr-002-bcrypt-password-hash.md)
- Plan 이력: [blf-workflow-adoption.md](./blf-workflow-adoption.md) (PR#2 섹션은 취소 — 상단 노트 참조)

---

## P1 — try-on API 보안 (최우선 — 진행 예정)

**목표**: `app/api/try-on` 라우트 인증·입력 검증 부재 해소.

**주요 작업** (미정):
- try-on API 엔드포인트 NextAuth 세션 인증 게이트 추가
- 입력 검증(이미지 URL, 파라미터 범위) 서버측 추가
- Replicate API 키 노출 여부 점검

**관련 문서**:
- [supabase-prisma-nextauth-setup.md](./supabase-prisma-nextauth-setup.md) (인증 패턴 참조)

---

## P2 — UX 완성 (예정)

**목표**: 결제 플로우, 검색, mypage 하위 라우트, 리뷰 등 미완성 UX 완성.

**주요 작업** (미정):
- 결제 플로우 (결제 게이트웨이 미정)
- 검색 기능
- mypage 하위 라우트 (`/mypage/orders`, `/mypage/profile` 등)
- 상품 리뷰

**관련 문서**:
- [style-analysis.md](../style-analysis.md) (디자인 시스템·UX 방향)

---

## P3 — 상품 카탈로그 DB화 (예정)

**목표**: `data/dummy.ts` 정적 목업 → Prisma `Product` 모델 + DB 기반 카탈로그.

**주요 작업** (미정):
- `prisma/schema.prisma`에 `Product` 모델 추가
- 상품 CRUD API 구현
- `data/dummy.ts` 의존 제거 (CLAUDE.md Forbidden 해소)
- 상품 이미지 스토리지 전략 결정 (미정)

**관련 문서**:
- ADR: [adr-003](../adr/adr-003-test-db-strategy.md) (DB 전략 패턴 참조)
- [supabase-prisma-nextauth-setup.md](./supabase-prisma-nextauth-setup.md) (Prisma 패턴)
