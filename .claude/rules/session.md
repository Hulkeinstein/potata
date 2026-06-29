# potata 세션 컨텍스트

> 시점 주의: 작성자 관점 표현 금지. 독자(작업 재개 시점) 관점으로 기술.

---

## 북극성 골

potata = 한국→UAE 패션 커머스. 인증·커머스 MVP·카탈로그 DB·Google OAuth·영속화·OOTD 피드·관리자 상품 등록·배지 자동화까지 정착 완료. 다음 = 참여형 콘텐츠(리뷰)·검색·결제로 카탈로그 가치 확장. 배포·실유저 가동(Vercel env·Resend)은 병행 ops 트랙.

---

## 지금 작업

**상품 태그(tags)** 트랙 — `/plan`+momus(APPROVE ~94%) 완료, **단일 PR 실행 중**. Plan: `docs/work-plans/product-tags.md`. (리뷰·리뷰이미지·Q&A·검색 트랙 #41~#46 전부 머지 완료.)

**Objective**: admin 상품 등록 폼에서 태그를 칩(chip)으로 추가/삭제 → DB `Product.tags String[]` 저장 → 검색 부분매칭(`$queryRaw` UNNEST+ILIKE)으로 한글 태그 검색 가능 → 상품 상세에 읽기전용 칩 표시. 단일 PR.

**확정 결정**: 입력=칩(엔터/쉼표 add·x/backspace remove·중복방지·최대10개/20자) · 검색=부분매칭 `$queryRaw`(has 정확매칭 아님, 와일드카드 %/_/\ 이스케이프·파라미터 바인딩) · 표시=ProductDetailClient 읽기전용 칩(ProductCard 제외) · 스키마=`Product.tags String[] @default([])`(db push) · sizes/colors는 콤마 유지(tags만 칩). FormData=`forEach append`→`getAll`(콤마 split과 다른 경로).

**진행**: 단일 PR = Task 1~7(W1 schema·types·lib/products[toAppProduct+createProduct+searchProducts raw] → W2 admin route → W3 AdminProductForm 칩·ProductDetailClient 표시 → W4 테스트 2). 검증 F1~F9 + Tier2(validator+oracle).

**브랜치**: `feat/product-tags`. 스키마 1줄 추가(tags) 외 의존성 무변경(`git diff package.json` 빈 출력 유지).

---

## 최근 완료 (참고)

인증 복구 · 워크플로우 인프라 · try-on 보안 · 커머스 MVP · 카탈로그 DB화 · product-detail 스킬 · Google OAuth · 좋아요/장바구니/Recents 영속화 · OOTD 피드·태그 피커 · CI 비용 절감 · **관리자 상품 등록**(권한 env allowlist·Storage `product-images`·등록 API·`/admin/products/new` 폼, ADR-008) · **가격 자동(정가+할인율) + 배지 3종 자동화**(NEW 등록일·BEST 별점/리뷰·HOT 조회수) · middleware Edge `node:crypto` 회귀 수정. 상세 인덱스: `docs/work-plans/roadmap.md`.
