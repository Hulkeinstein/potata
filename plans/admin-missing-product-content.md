# 상품 정보 누락 관리

## 목표와 범위

2026-10-20 사용자 승인: 한·영 설명 또는 사진이 빠진 상품을 모아보되 기존 운영 이슈 기능과 중복하지 않는다. 기존 상품/옵션/설명/사진/재고/관계 데이터는 그대로 유지한다. 예상10~16파일, 난이도 중간, 복잡도 medium. 계획 후 실행 승인됨.

## 탐색 / Metis 검토

- 기존 operations assistant는 active 상품의 빈 대표 URL만 MISSING_PRODUCT_IMAGE로 감지한다. 설명 누락은 아직 없다.
- 상품 목록은 기존 catalog API/쿼리와 URL 조건/returnTo를 재사용한다. 새 페이지·감지 API·원장·poller 없음.
- 고객 설명 fallback은 유지한다. 다른 언어/옛 설명이 있어도 KO/EN 원본 칸이 비면 그 언어는 미작성이다.
- 기존 operations facts imageUrl:null은 unknown이다. 새 공통 판정에 넘길 때 이를 undefined로 변환해 미조회 사실을 누락으로 오판하지 않는다. 실제 DB Product.imageUrl은 nonnull.

## 확정 계약

- 한 개 순수 모듈 product-content-quality가 누락 규칙/필터 옵션/표시 문구를 소유한다. KO/EN 실제 null·빈 문자열·trim 후 공백/개행/Unicode whitespace는 누락. undefined는 미조회로 누락 경고 생성 금지.
- quality=all|missing-any|missing-ko|missing-en|missing-image. invalid→all. missing-any는 OR이며 상품 중복 없이 한 번. 사진은 대표 imageUrl 등록 여부만 검사, 외부 URL 접속 실패/차단/오류는 누락이라고 하지 않는다. 네트워크 검사 없음.
- 기존 q/brand/category/status/sort/page/pageSize와 AND 조합, 적용 시 page1, 초기화로all, page링크/edit returnTo 보존. 판매 중지 상품도 목록 기본all에서 조회가능.
- 목록 행에 '한국어 설명 없음', '영어 설명 없음', '대표 사진 없음' 배지 표시. fallback으로 고객에게 표시될 수도 있다는 안내와 사진 URL 등록 기준 안내. 기존 수정 링크 재사용.
- 빈 대표 URL은 기존 AdminInventoryProductThumbnail의 '이미지 없음' 대체 표시로 처리해 Next Image의 빈 src 오류를 막는다. 기존 재고 화면에도 동일 방어를 재사용하고 정상 URL 동작은 유지한다.
- 목록 필터는 pagination 전 적용하고 count/items 조건 동일. 정확한 whitespace 판정을 위해 quality가all이 아닐 때만 기존basewhere에 해당하는 id/KO/EN/imageUrl의 좁은 facts를 조회해 공유predicate로 matchingIDs를 만들고, 기존 Prisma where에id in을 결합한 뒤 기존 DB 정렬/count/pagination을 재사용한다. 페이지 일부만 클라이언트필터링 금지. 기본all은 추가 scan 없음. 해당 후보수에 비례하는 O(N) 읽기 한계를 기록하며 스키마추가/새SQL조건중복은 도입하지 않는다. N+1 금지.
- operations loader는 KO/EN select를 추가하고 같은판정을 사용한다. 기존 MISSING_PRODUCT_IMAGE 한 건을 유지, 설명 누락은 MISSING_PRODUCT_DESCRIPTION 한 건/상품으로 합치고 실제 빠진 언어를 reason에 표시(impact1상품). 중복image/description 이슈 생성 금지. 활성만warning, inactive는 기존INACTIVE_PRODUCT info만, 미조회facts는 경고하지 않음. 재고/문의/쿠폰 심각도·정렬·계약 불변.
- 운영 이슈 페이지에 기존 상품 목록 quality=missing-any 바로가기 한 개만 추가. 수정/해결은 기존 상품 편집. 새 고객 화면이나 자동 생성/자동 숨김/가격·재고·상태 변경 없음.
- 코드 검토로 확인한 해결 경로 보완: 실제 imageUrl이 빈 문자열이면 기존 편집폼이 사진 편집기를 숨기고 image API도 빈 expectedImageUrl을 거부한다. 누락 상품에서 기존 사진 편집기를 표시하고 빈/whitespace 대표는 placeholder로 렌더한다. image API는 누락 필드(null)는 거부하되 실제 현재 URL이 빈 문자열일 때 빈 expected string의 정확 CAS 교체를 허용한다. 기존 파일검사/auth/본문상한/원본보존은 유지하며 실패우선 회귀로 고정한다.
- 실제 multipart는 줄바꿈 문자열을 CRLF로 정규화하므로 whitespace 원본 CAS 보존을 위해 UI가 expectedImageUrl을 encodeURIComponent하고 expectedImageUrlEncoding=uri를 명시한다. 서버는 marker가uri일 때만 한번decode, malformed/중복/미지원marker 거부, decode후4096자 상한(Unicode percent encoding을 포함해 encode전송은49152자 상한). 기존 marker없는 plain URL 클라이언트도 그대로 지원하고 DB 문자열은 정규화하지 않는다.

## TODOs

- [x] 1. 공통 누락 규칙과 운영 이슈 연결 + TDD
  - 참조: lib/operations-assistant.ts/test, types/operations-assistant.ts, lib/product-description.ts(변경금지).
  - RED: null/blank/whitespace/undefined, KO만/EN만/둘다/legacyfallback, active/inactive/unknown, 기존image 한건·설명한건 영향1.
  - QA: 분류기 실제 실행·기존 회귀, 공통규칙외 중복검사 없음.
- [x] 2. 기존 상품 목록 필터·배지·URL 연결 + TDD
  - 참조: lib/admin-catalog-query.ts/test, lib/admin-product-catalog.ts/readtests, AdminProductCatalogClient/test, products/page.tsx, operations/page.tsx.
  - RED: parser/serialization/safe-return, count/items동일조건, pagination전 OR/AND/empty결과, 기존status/brand/category/sort, 필터 UI/배지/링크.
  - QA: 로컬실제DB 대조와 desktop1280/mobile390, 필터적용→편집→복귀 조건 유지, 정상데이터 복구후 누락이 없어지는 fixture검증.
- [x] 3. 통합 검증·기록
  - focused/full Vitest, tsc, ESLint, build, diff-check. 소스250pureLOC이하.
  - 기존9상품40옵션 전체지문 전후비교. 필요시 로컬 비공개disposable fixture만 생성하고 정리. 외부Storage·운영DB 쓰기 없음.
  - evidence/admin-missing-product-content/verification.md에 RED/GREEN·실DB·UI·정리 기록. 서버 유지.

## Final Verification Wave

- [x] F1. 목표/중복 방지 검토
- [x] F2. 코드 품질 검토
- [x] F3. 보안/개인정보 경계 검토
- [x] F4. 실제 QA
- [x] F5. 기존 맥락 검토

완료 근거: evidence/admin-missing-product-content/verification.md. 데스크톱은 기존 브라우저 크기, 모바일은 390×844에서 확인했으며 정확한 desktop1280 재측정은 미실행. 빌드 후 서버는 재시작했지만 기존 오류 탭 reload가 브라우저 URL 정책에 차단되어 최종 탭 재열기는 확인하지 못했다. 빌드 전 실제 필터·편집·저장 QA는 완료했다.

## 실행과 경계

1→2→3 순서, 동일 파일 충돌을 피하려고 단일 구현 담당. 계획/프로그래밍/start-work/프론트엔드/최종review 스킬 사용. 기존 Next/Prisma/Vitest/npm/ESLint 유지, dependencies/schema/migration 변경 없음. 실제 외부이미지 검사/업로드, DB reset, 기존데이터 수정, commit/push/배포 제외. 기존dirty ADR/로드맵/임시파일 보존. 사용자 요청이 계획+진행이므로 계획 뒤 재승인 없이 위임 실행한다.
