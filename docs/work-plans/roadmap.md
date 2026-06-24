# potata Master Roadmap

> 마지막 업데이트: 2026-06-24
> 목적: P0~P3 작업 인덱스. 각 항목의 상세 plan은 링크된 문서 참조.
> 이 파일은 인덱스만 — 상세 plan 작성 금지.

---

## ✅ P0 — 인증 복구 (완료)

**완료** (origin/main #11/#12/2c47833): `verification-store.ts` dead code 삭제, signup `bcrypt.hash`+`$transaction(user.upsert)`, verify `user.upsert(emailVerified:true)`. signup→verify→login 로직 실 DB로 실측 검증됨.

**관련**: [verification-store-cleanup.md](./verification-store-cleanup.md) · ADR [adr-001](../adr/adr-001-db-verification-store.md)·[adr-002](../adr/adr-002-bcrypt-password-hash.md)

---

## 🔧 로그인 실유저 가용성 — 선결 (config/ops, 코드 아님)

> 로그인 *로직*은 검증 완료. 실유저가 실제 로그인하려면 아래 env/ops 선결 필요(대시보드/환경).

- [x] 로컬 `.env.local` `DATABASE_URL`에 `?pgbouncer=true` (42P05 prepared-statement 오류 해소 확인)
- [ ] **Vercel `DATABASE_URL`에도 `?pgbouncer=true` 필수** — 누락 시 프로덕션 간헐 오류 재발
- [ ] Vercel 환경변수 6종: `DATABASE_URL` `DIRECT_URL` `NEXTAUTH_SECRET` `NEXTAUTH_URL` `RESEND_API_KEY` `REPLICATE_API_TOKEN` (현재 Vercel 배포 실패 원인)
- [ ] Resend 도메인 인증 — 실 신규 유저 인증 코드 메일(미설정 시 샌드박스라 미수신 → verify 불가)
- [ ] (선택) 풀러 URL `&connection_limit=1` — 서버리스 튜닝

---

## ✅ P1 — try-on API 보안 (완료, #15)

`auth()` 세션 게이트(미인증 401, 가장 먼저) + 입력 검증(`data:image/*`/https, ~10MB) + Replicate 토큰 서버 전용 + 회귀 테스트 4종.

**Near-term 후보**: 영속 per-user rate limit(`@upstash/ratelimit`) — in-memory는 서버리스 콜드스타트에 무용, 현재 `auth()`가 실질 방어선.

---

## ✅ P2a — 커머스/체크아웃 MVP (완료, #17·#18·#19)

장바구니 → `/checkout` → `POST /api/orders`(서버 가격 재검증·로그인 필수·멱등성·`$transaction`) → 주문 저장(status=PENDING) → `/mypage/orders` 내역. 단위(mock)+통합(실 Postgres) 테스트, CI Postgres 서비스.

**관련**: [archive/commerce-checkout-mvp.md](./archive/commerce-checkout-mvp.md) · ADR [adr-004](../adr/adr-004-order-json-snapshot.md)
**OUT(추후)**: 결제 게이트웨이, 관계형 OrderItem, 쿠폰/포인트/재고/환불.

---

## ✅ 상품상세 skill · OAuth · UX · 영속화 · OOTD · CI (완료, #24~#34)

P3(카탈로그 DB) 이후 머지된 트랙들:

- **#24 product-detail 스킬**: 자유 텍스트 → `prisma/seed.ts` PRODUCTS 추가/갱신 → `db seed` upsert. **seed.ts = 상품 SSoT, DB는 파생물**. (`.claude/skills/product-detail/SKILL.md`)
- **#25 Google OAuth**: NextAuth v5 Google + Credentials 병행, JWT no-adapter. ADR [adr-006](../adr/adr-006-oauth-jwt-no-adapter.md).
- **#26 AI COORDINATOR 팝업화**: 홈 패널 → 팝업(끄기 / 하루 동안 보지 않기).
- **#27·#28·#29 좋아요·장바구니·Recents 계정 DB 영속화**: 로그아웃/재로그인/타기기에서 보존. `WishlistItem`/`CartItem`/`RecentTryOn` + `StoreSync`. (`persist-cart-wishlist.md`)
- **#30·#31·#32 OOTD 피드 실작동**: Supabase Storage 업로드 + 피드 GET + 좋아요 + 본인 삭제 + 상품 태그. ADR [adr-007](../adr/adr-007-supabase-storage.md). (`ootd-feed.md`)
- **#33 OOTD 상품 태그 피커**: 검색 + 최근 구매 + 썸네일 그리드.
- **#34 CI 비용 절감**: lockfile 크로스플랫폼 재생성(npm 11.3.0+, npm bug #4828) → `npm ci` + 캐시 복원 / `push:main` 트리거 제거(중복 실행 제거) / concurrency·timeout 가드레일.

---

## P2b — 나머지 UX (예정)

- 검색 기능 (`SearchOverlay` → 실 필터/결과 페이지)
- mypage 하위 라우트 (coupons/points/notifications/settings)
- 상품 리뷰 작성
- **결제 게이트웨이** (커머스 MVP 후속 트랙 — `/plan` 권장)

**관련**: [style-analysis.md](../style-analysis.md)

---

## ✅ P3 — 상품 카탈로그 DB화 (완료, #21·#22)

`data/dummy.ts` 정적 상품 → Prisma `Product` 모델. 8개 화면 DB 조회(서버 fetch→클라 props), 상세 ISR, orders 가격 재검증 DB화, dummy PRODUCTS 제거(TRENDS만 잔존). `lib/products.ts` 헬퍼.

**관련**: ADR [adr-005](../adr/adr-005-product-model.md) · [archive/catalog-db.md](./archive/catalog-db.md)

---

## ▶ 다음 작업 (다음 세션) — 관리자 상품 등록 + 이미지 업로드

운영자가 UI에서 실상품을 등록(이미지 업로드 포함)할 수 있게 한다. ADR-007 Supabase Storage 인프라 재사용. 검색·리뷰·배포 모두의 상류(실 카탈로그 콘텐츠 선행). **선결 결정 3가지**(handoff 참조):
1. **상품 SSoT 충돌**: product-detail 스킬은 `seed.ts`를 SSoT로 보는데(직접 DB write 금지), admin UI는 DB 직접 write → 재시드 시 소실. seed.ts SSoT를 "부트스트랩"으로 완화할지 ADR 필요.
2. **admin 권한 게이트**: User에 `role`/`isAdmin` 없음 → role 필드 추가 vs env 이메일 allowlist.
3. **Storage 헬퍼 일반화**: `lib/supabase-storage.ts`가 "ootd-images" 하드코딩 → 상품용 버킷/일반화.

경위·확정 설계·시작 절차: [handoff/2026-06-24-admin-product-upload.md](./handoff/2026-06-24-admin-product-upload.md).
