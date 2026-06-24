# potata 세션 컨텍스트

> 시점 주의: 작성자 관점 표현 금지. 독자(작업 재개 시점) 관점으로 기술.

---

## 북극성 골

potata = 한국→UAE 패션 커머스. 인증·커머스 MVP·카탈로그 DB·Google OAuth·좋아요/장바구니/Recents 계정 영속화·OOTD UGC 피드까지 정착 완료. 다음 = 실 카탈로그 콘텐츠(관리자 상품 등록) → 배포·실유저 가동(Vercel env·Resend) → 검색/리뷰/결제 확장.

---

## 지금 작업

**관리자 상품 등록 + 이미지 업로드** 트랙. 운영자가 보호된 UI에서 신상품(필수 필드 + 이미지)을 등록 → 카탈로그/상세에 즉시 노출. ADR-007 Supabase Storage 인프라 재사용.

**Goal/DoD**: admin 게이트로 보호된 등록 폼 → 이미지 Storage 업로드 + `Product` DB 생성 → 목록/상세 반영. `tsc`·`lint`·`test` green + Tier 2 적대검증 통과.

**선결 결정 3가지(코딩 전 `/plan`에서 확정 — cross-check 실측 기반)**: ① **상품 SSoT 충돌** — `product-detail` 스킬은 `seed.ts`를 상품 SSoT로 보는데(직접 DB write 금지), admin UI의 DB 직접 write는 재시드 시 소실 → ADR-008 후보. ② **admin 권한** — `User`에 `role`/`isAdmin` 없음 → role 필드 추가 vs env 이메일 allowlist. ③ **Storage 헬퍼 일반화** — `lib/supabase-storage.ts`가 "ootd-images" 하드코딩 → 상품용 버킷/일반화.

**브랜치**: `feat/admin-product-upload`(최신 main 기반 생성됨). 경위·재사용 패턴·시작 절차: `docs/work-plans/handoff/2026-06-24-admin-product-upload.md`.

---

## 최근 완료 (참고)

인증 복구 · 워크플로우 인프라(vitest+CI+SSoT) · try-on 보안 · 커머스 MVP(장바구니→체크아웃→주문) · 카탈로그 DB화 · `product-detail` 스킬 · Google OAuth(ADR-006) · AI COORDINATOR 팝업화 · 좋아요/장바구니/Recents 계정 영속화 · OOTD 피드(업로드·좋아요·삭제·상품태그, ADR-007) · OOTD 상품 태그 피커 · CI 비용 절감(npm ci 캐시 복원 + 중복 실행 제거). 상세 인덱스: `docs/work-plans/roadmap.md`.
