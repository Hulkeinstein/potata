# potata 세션 컨텍스트

> 시점 주의: 작성자 관점 표현 금지. 독자(작업 재개 시점) 관점으로 기술.

---

## 북극성 골

potata = 한국→UAE 패션 커머스·SNS. 인증·커머스 MVP·카탈로그·리뷰·Q&A·검색·OOTD·소셜 그래프·My Posts·팔로우 알림까지 정착 완료. 운영 배포·실유저 가동은 External waitlist에서 별도 관리한다.

---

## 지금 작업

**My Posts·Navbar unread badge·팔로우 알림 완료** 상태. 로컬 배포 준비는 완료됐고, 도메인/Resend 실발송·운영 DB baseline 승인·Vercel/Supabase/Google/Replicate 설정·실제 배포는 owner 접근/설정 및 별도 승인 대기의 External waitlist로 분리했다.

**현재 기준선**: TypeScript 통과, lint 0 errors(기존 경고 3), Vitest 359 passed/6 skipped. 로컬 `potata_dev`에서 production build 47/47 route generation이 통과한다.

**진행**: OOTD 댓글·좋아요·팔로우 알림, 마이페이지 알림 목록·전체 읽음, Navbar unread badge, `/mypage/posts`의 OOTD·Reviews·Q&A 모아보기/수정/삭제가 완료됐다. 다음 제품 후보는 결제 gateway 연동이며, 외부 계정·비밀값·운영 DB·실제 배포는 접근 정보와 각각의 별도 승인 전까지 변경 금지.

**외부 대기**: 운영 DB는 ADR-009에 따라 backup/restore와 read-only drift/history를 먼저 증명하고 별도 승인 후 baseline 이력만 등록한다. Resend 실메일과 운영 배포 smoke는 도메인·대상 프로젝트·비밀값·승인이 제공된 뒤 수행한다.

---

## 최근 완료 (참고)

인증 복구 · 워크플로우 인프라 · try-on 보안 · 커머스 MVP · 카탈로그 DB화 · product-detail 스킬 · Google OAuth · 좋아요/장바구니/Recents 영속화 · OOTD 피드·태그 피커 · CI 비용 절감 · **관리자 상품 등록**(권한 env allowlist·Storage `product-images`·등록 API·`/admin/products/new` 폼, ADR-008) · **가격 자동(정가+할인율) + 배지 3종 자동화**(NEW 등록일·BEST 별점/리뷰·HOT 조회수) · middleware Edge `node:crypto` 회귀 수정. 상세 인덱스: `docs/work-plans/roadmap.md`.
