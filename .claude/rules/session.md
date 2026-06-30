# potata 세션 컨텍스트

> 시점 주의: 작성자 관점 표현 금지. 독자(작업 재개 시점) 관점으로 기술.

---

## 북극성 골

potata = 한국→UAE 패션 커머스. 인증·커머스 MVP·카탈로그 DB·Google OAuth·영속화·OOTD 피드·관리자 상품 등록·배지 자동화까지 정착 완료. 다음 = 참여형 콘텐츠(리뷰)·검색·결제로 카탈로그 가치 확장. 배포·실유저 가동(Vercel env·Resend)은 병행 ops 트랙.

---

## 지금 작업

**P1 소셜 그래프**(패션 SNS 전환) 트랙 — `/plan`+momus(APPROVE ~94%) 완료, **PR1(백엔드) 실행 중**. Plan: `docs/work-plans/social-graph.md`. 비전: `docs/work-plans/fashion-social-research.md`. (상품 태그 #47까지 머지 완료.)

**Objective**: 기존 OOTD 피드 위에 소셜 그래프 — 팔로우/언팔로우 + `@handle` 공개 프로필 + `/what-to-wear` "전체/팔로잉" 탭. 2 PR: **PR1=백엔드**(Follow 스키마·handle·팔로우 API·피드 공개·팔로잉 필터·테스트), PR2=UI(프로필 페이지·탭·온보딩).

**확정 결정**: 라우트 `app/profile/[handle]`(@는 UI 표기) · 전체 탭=비로그인 공개(tab=all GET만 401 완화, 쓰기/팔로잉 탭 401 유지) · handle=`String? @unique` nullable(이메일 가입 폼 입력+중복체크, OAuth·기존=null→온보딩[PR2], 비가역 backfill 회피) · 팔로우=멱등 토글(IDOR: follower=session만, self-follow 차단) · 프로필 MVP. Follow+User.handle 스키마 승인.

**진행(PR1)**: Wave1(T1 schema Follow+handle·T2 lib/handle.ts·T3 types) → Wave2(T4 signup handle+중복체크 API·T5 팔로우 API·T6 피드 공개·팔로잉 필터) → Wave3(T7 테스트). F1~F8 + Tier2(IDOR·공개경계·비가역 다중 적대검증).

**브랜치**: `feat/social-graph`. 스키마 변경(Follow+User.handle) 외 의존성 무변경.

---

## 최근 완료 (참고)

인증 복구 · 워크플로우 인프라 · try-on 보안 · 커머스 MVP · 카탈로그 DB화 · product-detail 스킬 · Google OAuth · 좋아요/장바구니/Recents 영속화 · OOTD 피드·태그 피커 · CI 비용 절감 · **관리자 상품 등록**(권한 env allowlist·Storage `product-images`·등록 API·`/admin/products/new` 폼, ADR-008) · **가격 자동(정가+할인율) + 배지 3종 자동화**(NEW 등록일·BEST 별점/리뷰·HOT 조회수) · middleware Edge `node:crypto` 회귀 수정. 상세 인덱스: `docs/work-plans/roadmap.md`.
