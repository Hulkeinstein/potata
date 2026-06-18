# potata Master Roadmap

> 마지막 업데이트: 2026-06-16
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

## ▶ 다음 작업 (다음 세션) — 상품 상세 페이지 구현 skill

`별도 명령 없이 "스킬 + 상세 정보"만 주면 상품 상세 페이지를 자동 구현`하는 재사용 Claude Code skill 생성. 카탈로그 DB(P3) 토대 위에서. 경위·미정 설계·시작 절차: [handoff/2026-06-16-product-detail-skill.md](./handoff/2026-06-16-product-detail-skill.md).

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
