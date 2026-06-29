# potata 세션 컨텍스트

> 시점 주의: 작성자 관점 표현 금지. 독자(작업 재개 시점) 관점으로 기술.

---

## 북극성 골

potata = 한국→UAE 패션 커머스. 인증·커머스 MVP·카탈로그 DB·Google OAuth·영속화·OOTD 피드·관리자 상품 등록·배지 자동화까지 정착 완료. 다음 = 참여형 콘텐츠(리뷰)·검색·결제로 카탈로그 가치 확장. 배포·실유저 가동(Vercel env·Resend)은 병행 ops 트랙.

---

## 지금 작업

**상품 Q&A(문의/답변) 섹션** 트랙 — `/plan`+momus(~95%) 완료, **PR1(스키마+API) 실행 중**. Plan: `docs/work-plans/product-qna.md`. (리뷰 트랙 #41·#42·#43 전부 머지 완료.)

**Objective**: 비작동 Q&A 탭(ProductDetailClient:295-311)을 실작동시킨다. 로그인 유저가 질문 작성·조회·수정·삭제, admin이 답변 작성·수정·삭제. 질문 삭제 시 답변 cascade. 리뷰 패턴 복제하되 이미지·평점집계·upsert 제거.

**확정 결정**: 질문 권한=전체 로그인(구매 게이트 없음) · 답변=admin only(isAdmin) · 수정삭제=질문(본인 수정·삭제+admin 삭제)·답변(admin CRUD). Question(1):Answer(N) onDelete Cascade. 1인 N질문(@@unique 없음)→questionId 기반+IDOR 명시 소유검증. JSON body·create·revalidatePath.

**진행**: PR1 = Task 1~9(W1 schema/types → W2 route 4개(질문 GET/POST·PATCH/DELETE, 답변 POST·PATCH/DELETE) → W3 테스트+db push). PR2 skeleton = Task 10~12(QASection·연동·테스트). 검증 F1~F13.

**브랜치**: `feat/product-qna`. 운영 선결 없음(이미지 OUT — db push만).

---

## 최근 완료 (참고)

인증 복구 · 워크플로우 인프라 · try-on 보안 · 커머스 MVP · 카탈로그 DB화 · product-detail 스킬 · Google OAuth · 좋아요/장바구니/Recents 영속화 · OOTD 피드·태그 피커 · CI 비용 절감 · **관리자 상품 등록**(권한 env allowlist·Storage `product-images`·등록 API·`/admin/products/new` 폼, ADR-008) · **가격 자동(정가+할인율) + 배지 3종 자동화**(NEW 등록일·BEST 별점/리뷰·HOT 조회수) · middleware Edge `node:crypto` 회귀 수정. 상세 인덱스: `docs/work-plans/roadmap.md`.
