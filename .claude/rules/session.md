# potata 세션 컨텍스트

> 시점 주의: 작성자 관점 표현 금지. 독자(작업 재개 시점) 관점으로 기술.

---

## 북극성 골

potata = 한국→UAE 패션 커머스. 인증·커머스 MVP·카탈로그 DB·Google OAuth·영속화·OOTD 피드·관리자 상품 등록·배지 자동화까지 정착 완료. 다음 = 참여형 콘텐츠(리뷰)·검색·결제로 카탈로그 가치 확장. 배포·실유저 가동(Vercel env·Resend)은 병행 ops 트랙.

---

## 지금 작업

**리뷰 이미지 첨부 + admin 우회** 트랙 — `/plan`+momus(~95%) 완료, **단일 PR 실행 중**. Plan: `docs/work-plans/review-images-admin.md`. (리뷰 PR1#41+PR2#42 머지 완료.)

**Objective**: 로그인 구매자(또는 admin)가 리뷰에 이미지 0~3장 첨부·조회·수정·삭제. admin(ADMIN_EMAILS)은 미구매 상품에도 작성, 일반 유저는 구매 게이트 유지. tsc·lint·test·build green + Tier2 다중 적대검증(파일 업로드 보안·권한 게이트).

**확정 결정**: 이미지 ≤3장·선택·5MB·jpg/png/webp·magic-byte. `review-images` 신규 버킷. admin 우회=`isAdmin(session.user.email) || hasPurchasedProduct`. POST JSON→multipart 전환(→ 단일 atomic PR 필수). 수정 시 차집합만 Storage 정리, 삭제 시 전량, DB 실패 시 보상.

**진행**: 단일 PR = TODO 1~11(W1 schema/types/storage래퍼/magic-byte공용 → W2 route GET/POST/DELETE → W3 ReviewSection UI → W4 테스트 → W5 db push). 검증 F1~F9.

**브랜치**: `feat/review-images-admin`. ⚠️ 운영 선결(F8): `review-images` public 버킷 Supabase 콘솔 생성 필요(실업로드용).

---

## 최근 완료 (참고)

인증 복구 · 워크플로우 인프라 · try-on 보안 · 커머스 MVP · 카탈로그 DB화 · product-detail 스킬 · Google OAuth · 좋아요/장바구니/Recents 영속화 · OOTD 피드·태그 피커 · CI 비용 절감 · **관리자 상품 등록**(권한 env allowlist·Storage `product-images`·등록 API·`/admin/products/new` 폼, ADR-008) · **가격 자동(정가+할인율) + 배지 3종 자동화**(NEW 등록일·BEST 별점/리뷰·HOT 조회수) · middleware Edge `node:crypto` 회귀 수정. 상세 인덱스: `docs/work-plans/roadmap.md`.
