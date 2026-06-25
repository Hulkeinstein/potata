# potata 세션 컨텍스트

> 시점 주의: 작성자 관점 표현 금지. 독자(작업 재개 시점) 관점으로 기술.

---

## 북극성 골

potata = 한국→UAE 패션 커머스. 인증·커머스 MVP·카탈로그 DB·Google OAuth·영속화·OOTD 피드·관리자 상품 등록·배지 자동화까지 정착 완료. 다음 = 참여형 콘텐츠(리뷰)·검색·결제로 카탈로그 가치 확장. 배포·실유저 가동(Vercel env·Resend)은 병행 ops 트랙.

---

## 지금 작업

**상품 리뷰 작성** 트랙 — `/plan`+momus 검증 완료, **PR1(스키마+API) 실행 중**. Plan: `docs/work-plans/product-reviews.md`.

**Objective**: 로그인 구매자가 상품에 별점(1~5)+코멘트 리뷰를 작성·수정·삭제·조회, 변경 시 `Product.rating`(평균)·`reviewCount`를 `$transaction` 원자 재집계 → BEST 배지(별점≥4.8 & 리뷰≥100, `lib/products.ts:68`) 자동 충족.

**선결 4결정(전부 확정)**: ① `@@unique([userId,productId])` 채택(upsert) ② 매번 `aggregate(_avg,_count)` 재계산($transaction) ③ 권한=**구매자만**(ADR-004 Json → 유저 Order fetch+JS 필터, status 무관) ④ 작성+조회+수정+삭제.

**진행**: PR1 = TODO 1~8(Review 모델·타입·집계헬퍼·구매자게이트·GET/POST upsert/DELETE·테스트·db push). PR2 = TODO 9~12(StarRating·ReviewSection·연동·테스트). 검증 F1~F8.

**브랜치**: `feat/product-reviews`. 경위·재사용 패턴: `docs/work-plans/handoff/2026-06-24-product-reviews.md`.

---

## 최근 완료 (참고)

인증 복구 · 워크플로우 인프라 · try-on 보안 · 커머스 MVP · 카탈로그 DB화 · product-detail 스킬 · Google OAuth · 좋아요/장바구니/Recents 영속화 · OOTD 피드·태그 피커 · CI 비용 절감 · **관리자 상품 등록**(권한 env allowlist·Storage `product-images`·등록 API·`/admin/products/new` 폼, ADR-008) · **가격 자동(정가+할인율) + 배지 3종 자동화**(NEW 등록일·BEST 별점/리뷰·HOT 조회수) · middleware Edge `node:crypto` 회귀 수정. 상세 인덱스: `docs/work-plans/roadmap.md`.
