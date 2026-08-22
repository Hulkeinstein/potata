# potata Master Roadmap

> 마지막 업데이트: 2026-08-22
> 목적: P0~P3 작업 인덱스. 각 항목의 상세 plan은 링크된 문서 참조.
> 이 파일은 인덱스만 — 상세 plan 작성 금지.

---

## ✅ P0 — 인증 복구 (완료)

**완료** (origin/main #11/#12/2c47833): `verification-store.ts` dead code 삭제, signup `bcrypt.hash`+`$transaction(user.upsert)`, verify `user.upsert(emailVerified:true)`. signup→verify→login 로직 실 DB로 실측 검증됨.

**관련**: [verification-store-cleanup.md](./verification-store-cleanup.md) · ADR [adr-001](../adr/adr-001-db-verification-store.md)·[adr-002](../adr/adr-002-bcrypt-password-hash.md)

---

## ⏳ External waitlist — 운영 배포·실유저 가동

> 기능 개발은 계속 진행한다. 아래 외부 항목은 owner가 대상 프로젝트·접근 권한·설정값을 제공하고 별도 적용을 승인할 때까지 대기하며, 완료로 간주하지 않는다.

### 로컬 준비 완료

- [x] 로컬 `.env.local` `DATABASE_URL`에 `?pgbouncer=true` (42P05 prepared-statement 오류 해소 확인)
- [x] migration baseline 파일·신규 DB deploy 경로 준비 — production `db push` 금지 정책 유지
- [x] 개발 전용 PostgreSQL baseline·seed 및 preview signup → verification → login 검증
- [x] DB-backed production build와 ephemeral PostgreSQL CI migration/status/schema parity 경로 검증

### 외부 설정 대기

- [ ] Resend 발신 도메인 인증, `EMAIL_FROM`·API key·테스트 수신 주소 제공 후 실메일 검증
- [ ] 운영 DB backup/restore 증거와 read-only schema drift·migration history 확인 후 baseline resolve **별도 승인** — 절차 SSoT: [ADR-009](../adr/adr-009-prisma-migration-baseline.md)
- [ ] Vercel 환경변수: DB(`DATABASE_URL`에 `?pgbouncer=true`, `DIRECT_URL`), Auth(`NEXTAUTH_SECRET` `NEXTAUTH_URL`), 운영(`ADMIN_EMAILS` `NEXT_PUBLIC_BASE_URL`)
- [ ] Supabase 대상 project·Storage bucket 및 server-only key 설정 확인
- [ ] Google OAuth 운영 callback/client 설정과 Replicate access 확인
- [ ] 운영 deployment 대상 확인 및 **별도 배포 승인** 후 smoke test
- [ ] (선택) 풀러 URL `&connection_limit=1` — 서버리스 튜닝

운영 DB 명령과 deployment는 접근 정보만 제공되어도 자동 실행하지 않으며, 각각 명시적인 별도 승인 전에는 수행하지 않는다.

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

## ✅ P2b — 검색·상품 참여 UX (완료, #41~#47)

- 상품 리뷰 작성·수정·삭제, 이미지 0~3장, 관리자 구매 게이트 우회 (#41~#43)
- 상품 Q&A 질문·관리자 답변 UI/API (#44~#45)
- 검색 결과 페이지와 상품 태그 부분검색 (#46~#47)

**관련**: [style-analysis.md](../style-analysis.md)

---

## ✅ P3 — 상품 카탈로그 DB화 (완료, #21·#22)

`data/dummy.ts` 정적 상품 → Prisma `Product` 모델. 8개 화면 DB 조회(서버 fetch→클라 props), 상세 ISR, orders 가격 재검증 DB화, dummy PRODUCTS 제거(TRENDS만 잔존). `lib/products.ts` 헬퍼.

**관련**: ADR [adr-005](../adr/adr-005-product-model.md) · [archive/catalog-db.md](./archive/catalog-db.md)

---

## ✅ 관리자 상품 등록 + 배지 자동화 (완료, #35~40)

운영자가 보호된 admin UI에서 실상품(이미지 포함)을 등록하고, 배지가 데이터 기반 자동 부여된다.
- **#35 권한 게이트**: env `ADMIN_EMAILS` allowlist + `isAdmin` + middleware `/admin` + `createProduct`(randomUUID). 상품 SSoT = DB(런타임/admin), seed = 부트스트랩 한정 ([ADR-008](../adr/adr-008-product-ssot.md)).
- **#36 Storage + API**: `lib/supabase-storage` bucket 일반화(신규 `product-images`) + `POST /api/admin/products`(검증·업로드·보상 삭제·revalidate).
- **#37 등록 폼**: `/admin/products/new`(필드+이미지, 동기 useRef 제출 잠금).
- **#38 fix**: middleware Edge `node:crypto` 회귀 제거(`lib/normalize` 분리).
- **#39 가격·배지**: 정가+할인율→판매가 자동 계산. NEW(등록 1주일)·BEST(별점≥4.8·리뷰≥100) 자동 파생.
- **#40 HOT 자동화**: 조회수 추적(`Product.viewCount`, `POST /api/products/[id]/view`) → 상위 4개 HOT(별도 캐시 + 조회 시 `revalidateTag`).

**관련**: [archive/admin-product-upload.md](./archive/admin-product-upload.md) · [archive/hot-auto-views.md](./archive/hot-auto-views.md) · ADR [adr-008](../adr/adr-008-product-ssot.md)

---

## ✅ P1 소셜 그래프 (완료, #48~#49)

팔로우/언팔로우, `@handle` 공개 프로필, 전체/팔로잉 OOTD 피드와 handle 온보딩을 구현했다. 상세: [social-graph.md](./social-graph.md).

## ✅ My Posts (완료)

`/mypage/posts`에서 로그인 사용자가 본인의 OOTD·Reviews·Q&A를 URL 기반 탭으로 모아보고 수정·삭제할 수 있다. `/mypage`에는 설명형 진입 메뉴 1개만 추가했으며, OOTD image-first grid, Review/Q&A 상품 맥락 카드, 공개 프로필 CTA를 제공한다. 기존 모델만 사용해 별도 migration은 추가하지 않았다. 상세: [my-posts.md](../../plans/my-posts.md).

## ▶ 다음 후보

1. **Navbar unread notification badge**: 기존 알림 API의 `unreadCount`와 전체 읽음 흐름을 재사용해 전역 navigation에서 새 알림을 발견할 수 있게 한다. 신규 외부 서비스나 schema 변경 없이 진행하는 다음 1순위다.
2. **Follow notifications**: 팔로우 발생을 알림으로 연결한다. `NotificationType` 확장, 중복 방지·소유권 계약, migration과 UI 회귀 검증을 별도 계획으로 수행한다.
3. **결제 연동**: 기존 checkout·Order(PENDING/PAID/CANCELLED)를 실제 gateway와 연결한다. provider, webhook idempotency, 환불·실패 정책과 외부 계정 승인을 먼저 확정하며 쿠폰/포인트/재고는 별도 범위로 유지한다.

**External waitlist 유지**: Vercel/Supabase/Resend/Google/Replicate 설정, 운영 DB baseline, 실제 운영 배포는 owner 접근·설정값 및 항목별 별도 승인 전까지 구현 순위와 분리해 대기한다.
