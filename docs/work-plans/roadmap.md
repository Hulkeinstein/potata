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

## 🔧 로그인 실유저 가용성 — 선결 (config/ops, 코드 아님)

> 로그인 *로직*은 실 DB로 검증 완료(signup→verify→login). 단 **실유저가 실제로 로그인**하려면 아래 env/ops 선결 필요 (코드 변경 아님 — 대시보드/환경 작업).

- [x] 로컬 `.env.local` `DATABASE_URL`에 `?pgbouncer=true` 적용 (42P05 prepared-statement 오류 해소 확인)
- [ ] **Vercel `DATABASE_URL`에도 `?pgbouncer=true` 필수** — 누락 시 프로덕션에서 동일 간헐 오류 재발
- [ ] Vercel 환경변수 6종: `DATABASE_URL` `DIRECT_URL` `NEXTAUTH_SECRET` `NEXTAUTH_URL` `RESEND_API_KEY` `REPLICATE_API_TOKEN` (현재 Vercel 배포 실패 = 이 미설정)
- [ ] Resend 도메인 인증 — 실 신규 유저 인증 코드 메일 발송 (미설정 시 샌드박스라 미수신 → verify 불가)
- [ ] (선택) 풀러 URL `&connection_limit=1` — 서버리스 커넥션 튜닝 (Supabase 권장)

---

## ✅ P1 — try-on API 보안 (완료)

**목표**: `app/api/try-on` 라우트 인증·입력 검증 부재 해소.

**완료 내용** (#15):
- `auth()` 세션 게이트 (미인증 → 401, 다른 체크보다 먼저 — 서버 설정 노출 방지)
- 입력 검증: userImage/productImage는 `data:image/*` 또는 https URL, ~10MB 상한
- Replicate 토큰 서버측 전용 확인
- 회귀 테스트 4종 ([route.test.ts](../../app/api/try-on/route.test.ts)) — 미인증→401 등 CI 보장

**Near-term 후보**:
- 영속 per-user rate limit (`@upstash/ratelimit`) — in-memory는 서버리스 콜드스타트에 무용, 현재 `auth()`가 실질 방어선

---

## P2 — UX 완성 / 커머스 체크아웃 (다음 — `/plan` 착수 예정)

**목표**: 결제 플로우, 검색, mypage 하위 라우트, 리뷰 등 미완성 UX 완성. 최우선 = 체크아웃→주문 생성(매출 경로). 권장 순서: Prisma `Order` 모델 → `POST /api/orders` → `/checkout` → `/mypage/orders`. (카탈로그 DB화는 P3, MVP는 dummy.ts로 선출시 가능.)

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
