# potata 세션 컨텍스트

> 시점 주의: 작성자 관점 표현 금지. 독자(작업 재개 시점) 관점으로 기술.

---

## 북극성 골

potata = 한국→UAE 패션 커머스. 인증·커머스 MVP·카탈로그 DB·Google OAuth·좋아요/장바구니/Recents 계정 영속화·OOTD UGC 피드까지 정착 완료. 다음 = 실 카탈로그 콘텐츠(관리자 상품 등록) → 배포·실유저 가동(Vercel env·Resend) → 검색/리뷰/결제 확장.

---

## 지금 작업

**Plan**: admin-product-upload (`docs/work-plans/admin-product-upload.md`) — momus OKAY, 실행 중.
**Objective**: 운영자가 보호된 admin UI에서 신상품(필수 필드 + 이미지)을 등록 → `product-images` Storage 업로드 + `Product` DB 생성 → 카탈로그/상세 즉시 노출. ADR-007 인프라 재사용.

**선결 3결정 확정**(2026-06-24 인터뷰): ① 상품 SSoT = **DB(런타임/admin), seed = 부트스트랩**(ADR-008), admin id=`crypto.randomUUID()`. ② admin 권한 = **env `ADMIN_EMAILS` allowlist**(스키마 무변경), middleware+API 이중 게이트. ③ Storage = **신규 `product-images` 버킷 + 헬퍼 bucket 파라미터화**(OOTD 래퍼 유지). → 스키마/next.config/의존성 변경 0.

**PR 분할**: PR1(권한+헬퍼+ADR, 현 브랜치 `feat/admin-product-upload`) → PR2(Storage 일반화+API) → PR3(UI).
**진행 상태**: **PR1 머지 완료**(#35, ad3a7d2). 사용자 사전작업(`product-images` public 버킷 · `ADMIN_EMAILS`) 완료. **PR2 실행 중**(`feat/admin-product-api`).
**남은 작업(PR2)**: 7.Storage 헬퍼 일반화(`product-images`, OOTD 래퍼 유지) · 8.`POST /api/admin/products`(Ask First: 신규 라우트) · 9.단위테스트 · F2/F3 검증. 이후 PR3 등록 폼 UI.
**사용자 사전작업(PR2/PR3용)**: Supabase `product-images` public 버킷 생성 + `.env.local`·Vercel `ADMIN_EMAILS` 설정.

**브랜치**: `feat/admin-product-upload`. 경위: `docs/work-plans/handoff/2026-06-24-admin-product-upload.md`.

---

## 최근 완료 (참고)

인증 복구 · 워크플로우 인프라(vitest+CI+SSoT) · try-on 보안 · 커머스 MVP(장바구니→체크아웃→주문) · 카탈로그 DB화 · `product-detail` 스킬 · Google OAuth(ADR-006) · AI COORDINATOR 팝업화 · 좋아요/장바구니/Recents 계정 영속화 · OOTD 피드(업로드·좋아요·삭제·상품태그, ADR-007) · OOTD 상품 태그 피커 · CI 비용 절감(npm ci 캐시 복원 + 중복 실행 제거). 상세 인덱스: `docs/work-plans/roadmap.md`.
