# 상품 목록 개선과 대표 사진 교체

## 목표와 범위

2026-10-20 승인: 기존 기능과 겹치지 않게 계획 후 로컬 구현한다. 기존 상품/옵션 ID, 리뷰·찜·주문·재고·설명은 보존한다. 예상 15~24 코드/테스트 파일, 난이도 중간, 복잡도 medium. 스키마/마이그레이션·상품 재등록·운영 쓰기·commit/push/배포는 제외한다.

## 현황 / Metis 검토

- 기존 catalog 목록 API/domain과 편집 PATCH, product-images Storage 및 magic-byte 검사를 재사용한다. 신규 목록 원장/Storage adapter 없음.
- 현재 목록은 q/page만 지원, 상태 버튼이 전체 상품을 PATCH하는 덮어쓰기 위험이 있다. isActive 전용 mutation으로 좁힌다.
- 대표는 imageUrl과 images[0]을 함께 변경해야 고객 상세와 목록이 일치한다.
- 기존 이미지 URL은 주문 snapshot에서도 참조한다. 이전 파일 자동 삭제는 하지 않는다. 실패한 이번 요청의 새 파일만 보상 삭제한다.

## 확정 계약

- 업무형 dark 관리자 스타일 유지, 한국어 제목·필터·빈/실패 상태. 기존 이미지 fallback 컴포넌트 재사용 가능하면 재사용.
- q 최대100자, brand exact 최대100자, category는 기존6개, status all/active/inactive/sold-out, sort newest/name/price-asc/price-desc. page1~100, pageSize1~50 기본20. 미지원 값은 기본값. 정렬 ID tie-breaker.
- active = isActive이며 구매 가능한 옵션 존재. sold-out = isActive이며 구매 가능 옵션 없음. inactive = !isActive. count와 items 동일 DB 조건. 재고 총량과 구매가능 옵션 구분.
- URL이 조건 원장이다. 검색·필터 변경은 page1, 초기화 제공. 편집/취소/저장 후 목록의 적용된 조건 유지. returnTo는 /admin/products와 allowlisted query로 재구성하여 외부 이동 금지.
- 기존 JSON 편집 저장은 이미지 수정과 독립. 목록 판매 상태 버튼은 isActive만 변경하며 stale 가격/설명/재고를 보내지 않는다.
- /api/admin/catalog/[id]/image multipart endpoint: auth/isAdmin 선검사, image 한 개, expectedImageUrl, JPG/PNG/WebP 실제 signature/MIME 검사. 파일 최대3MiB, 실제 누적 request body 최대4MiB(무 Content-Length도 제한). 잘못된 입력/없는 상품은 업로드 전에 거부.
- uploadProductImage로 새 UUID 업로드 후 원자적 expectedImageUrl compare-and-swap. 성공시에만 imageUrl와 images를 새 대표가 첫 장인 배열로 갱신. 기존 대표 URL만 배열에서 제거하며 나머지 상세사진 순서 보존. 충돌409, 기존 파일 보존, 새 파일 보상 정리. DB 실패500 generic, cleanup 실패는 sanitized 서버 경고.
- 성공 후 products tag 무효화. 미리보기는 저장 완료가 아니며 별도 '대표 사진 저장'으로 확정한다. 선택 취소·다시 선택·오류·409 안내와 성공 피드백, 로딩 중 중복 제출 차단. 일반 편집 중 입력은 유지.

## TODOs

- [x] 1. 목록 DB 필터/정렬과 좁은 상태 변경 + 테스트
  - 참조: lib/admin-product-catalog.ts, app/api/admin/catalog, 기존 route/domain tests.
  - RED: 상태/브랜드/카테고리/정렬/count 일치, page clamp, 상태 변경 시 다른 필드 보존.
  - GREEN: 기존 함수 확장, 상품 새로 생성/삭제 없음.
  - QA: 실제 로컬 목록 읽기와 비관리자401/403; unit/route 회귀.
- [x] 2. 목록 UI와 안전한 복귀 + 테스트
  - 참조: AdminProductCatalogClient, AdminProductEditForm, products page/edit page.
  - 검색·필터·정렬·초기화·페이지/적용건수·사진/가격/상태/재고 요약. 조건이 편집 왕복 후 유지.
  - RED: UI filter query/returnTo, network 실패 유지/retry, malformed URL 안전 복귀.
  - QA: desktop1280/mobile390 overflow0, 조건/빈 목록/왕복; 기존 편집·재고 링크 유지.
  - 구현/컴포넌트 테스트 완료. 후속 사용자 승인 검증에서 브라우저 접근 및 실제 desktop/mobile/편집 왕복 QA 완료(live-upload.md).
- [x] 3. 대표 교체 API/domain/UI + 테스트
  - 참조: supabase-storage, product-image-signature, request-body, 기존 등록 업로드와 편집.
  - RED:401/403/404/oversize/MIME위조/성공/409/DB실패/cleanup실패, 원본/상세/관계/재고 불변.
  - QA: 미리보기·취소·저장·실패·충돌 UX, 실제 로컬 fixture DB update 회귀. 기존 상품 사진 쓰기 없음. 외부 Storage 실제 쓰기는 별도 사용자 승인 없이 실행하지 않고 wire fake와 route 테스트로 검증하고 미실행 경계 기록.
- [x] 4. 통합 검증과 기록
  - focused/full Vitest, tsc --noEmit, ESLint, build, diff-check. 스키마/기존 데이터 불변 확인.
  - evidence/admin-catalog-images/verification.md에 RED/GREEN, 실제/미실행 구분. browser 접근 차단이면 우회하지 않고 구체적 제한 기록.
  - 자동 검증 완료:891 tests PASS/16guarded skip, tsc/lint/build PASS. HTTP5/DB18 및 대표교체 실DB2 PASS. 후속 실제 UI/Storage 저장·새로고침·시각 QA도 완료, fixture/업로드 정리 후 데이터 지문 동일.

## Final Verification Wave

- [x] F1. 목표/중복·데이터 보존 검토
- [x] F2. 코드·보안 검토
- [x] F3. hands-on QA
- [x] F4. 기존 계약/범위 맥락 검토

## 실행

1→2, 3은 독립 파일 소유로 병행 가능, 이후4와5개 독립 review. 새 책임 파일250 pure LOC 이하. 기존 oversized 등록 route는 수정하지 않는다. 기존 dirty 관리자 shell/보고서/ADR/로드맵 보존. 사용자 이미 계획+실행 승인했으므로 계획 확정 후 작업자에게 실행 위임한다.
