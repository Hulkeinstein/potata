# potata 세션 컨텍스트

> 시점 주의: 작성자 관점 표현 금지. 독자(작업 재개 시점) 관점으로 기술.

---

## 북극성 골

potata = 한국→UAE 패션 커머스. 인증·커머스 MVP·카탈로그 DB·Google OAuth·영속화·OOTD 피드·관리자 상품 등록·배지 자동화까지 정착 완료. 다음 = 참여형 콘텐츠(리뷰)·검색·결제로 카탈로그 가치 확장. 배포·실유저 가동(Vercel env·Resend)은 병행 ops 트랙.

---

## 지금 작업

**상품 검색 기능** 트랙 — `/plan`+momus(~95%) 완료, **단일 PR 실행 중**. Plan: `docs/work-plans/product-search.md`. (리뷰·리뷰이미지·Q&A 트랙 #41~#45 전부 머지 완료.)

**Objective**: 비작동 SearchOverlay(제출 핸들러 없음)를 카탈로그 DB 검색으로 연결. 엔터/브랜드칩 → `/search?q=` 결과 페이지(server component) → name/brand/category 부분일치(대소문자 무시) 상품 ProductCard 그리드. 공개(인증 불필요).

**확정 결정**: 검색 UX=결과 페이지 이동(server component 직접 조회, API 없음) · 검색 대상=name/brand/category(contains insensitive, description 제외) · 스키마·의존성 무변경(name 인덱스·use-debounce·풀텍스트 OUT). searchProducts는 unstable_cache 미사용(동적). q 위생: trim·최소 2자·encodeURIComponent.

**진행**: 단일 PR = Task 1~5(W1 searchProducts 헬퍼·/search 페이지 → W2 SearchOverlay 제출 연결 → W3 테스트 2). 검증 F1~F13 + Tier2.

**브랜치**: `feat/product-search`. 운영 선결 없음(스키마/의존성 무변경 — `git diff schema.prisma package.json` 빈 출력 유지).

---

## 최근 완료 (참고)

인증 복구 · 워크플로우 인프라 · try-on 보안 · 커머스 MVP · 카탈로그 DB화 · product-detail 스킬 · Google OAuth · 좋아요/장바구니/Recents 영속화 · OOTD 피드·태그 피커 · CI 비용 절감 · **관리자 상품 등록**(권한 env allowlist·Storage `product-images`·등록 API·`/admin/products/new` 폼, ADR-008) · **가격 자동(정가+할인율) + 배지 3종 자동화**(NEW 등록일·BEST 별점/리뷰·HOT 조회수) · middleware Edge `node:crypto` 회귀 수정. 상세 인덱스: `docs/work-plans/roadmap.md`.
