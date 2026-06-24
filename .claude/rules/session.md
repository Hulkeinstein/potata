# potata 세션 컨텍스트

> 시점 주의: 작성자 관점 표현 금지. 독자(작업 재개 시점) 관점으로 기술.

---

## 북극성 골

potata = 한국→UAE 패션 커머스. 인증·커머스 MVP·카탈로그 DB·Google OAuth·영속화·OOTD 피드·관리자 상품 등록·배지 자동화까지 정착 완료. 다음 = 참여형 콘텐츠(리뷰)·검색·결제로 카탈로그 가치 확장. 배포·실유저 가동(Vercel env·Resend)은 병행 ops 트랙.

---

## 지금 작업

**상품 리뷰 작성** 트랙. 로그인 유저가 상품에 별점+코멘트 리뷰를 남기고 조회한다. `components/product/ProductDetailClient.tsx`에 **Review 탭·"Write a Review" UI 골격이 이미 존재(비작동)** → 백엔드(Review 모델·작성/조회 API) 연결이 핵심.

**Goal/DoD**: Review 모델 + 작성/조회 API(`auth()` 게이트) + 기존 Review 탭 UI 연결 + 리뷰 작성 시 `Product.rating`(평균)·`reviewCount` 재집계(`$transaction`). 이 재집계가 BEST 배지(별점≥4.8 & 리뷰≥100, `lib/products.ts toAppProduct`)를 자동으로 채운다. `tsc`·`lint`·`test` green + Tier2 적대검증 통과.

**선결 결정(코딩 전 `/plan`에서 확정)**: ① Review 스키마(별점 1~5·코멘트·`@@unique([userId,productId])` 1인1상품 — 🟡 Ask First) ② rating/reviewCount 집계 방식(`$transaction` denormalized) ③ 리뷰 권한(전체 로그인 vs 구매자만 — Order 연동) ④ 수정/삭제 범위(MVP = 작성+조회).

**브랜치**: `feat/product-reviews`(최신 main 기반 생성됨). 경위·재사용 패턴·시작 절차: `docs/work-plans/handoff/2026-06-24-product-reviews.md`.

---

## 최근 완료 (참고)

인증 복구 · 워크플로우 인프라 · try-on 보안 · 커머스 MVP · 카탈로그 DB화 · product-detail 스킬 · Google OAuth · 좋아요/장바구니/Recents 영속화 · OOTD 피드·태그 피커 · CI 비용 절감 · **관리자 상품 등록**(권한 env allowlist·Storage `product-images`·등록 API·`/admin/products/new` 폼, ADR-008) · **가격 자동(정가+할인율) + 배지 3종 자동화**(NEW 등록일·BEST 별점/리뷰·HOT 조회수) · middleware Edge `node:crypto` 회귀 수정. 상세 인덱스: `docs/work-plans/roadmap.md`.
