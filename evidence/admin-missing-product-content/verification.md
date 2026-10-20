# 상품 정보 누락 관리 최종 검증

2026-10-20. 사용자 승인 범위는 계획 및 구현이며 commit/push/deploy는 실행하지 않았다.

## 구현

- 기존 상품 목록에 전체 누락/한국어/영어/대표 사진 필터와 개별 배지 추가. 기존 검색·브랜드·상태·정렬·페이지·편집 복귀 조건 재사용.
- 공통 product-content-quality 판정을 운영 이슈에서도 재사용. 활성 상품의 설명 누락은 언어별 중복 없이 상품당 한 건, 비활성 상품의 기존 안내 정책 유지.
- 대표 사진 없는 상품도 기존 사진 편집기를 사용할 수 있게 수정. 빈 원본 CAS, multipart 개행 보존용 명시적 URI 인코딩, legacy 클라이언트 호환 및 실패 경계 회귀 검증.
- 고객 설명 fallback 변경 없음. 사진 검사는 URL 등록 여부만 확인하며 외부 URL 접근성 검사는 하지 않는다. 스키마·migration·자동 데이터 변경 없음.
- 누락 필터는 pagination 전에 적용. 필터를 켠 경우 후보 facts의 O(N) 읽기가 필요하며 기본 전체 보기에는 추가 scan이 없다.

## 자동 검증

- 실패 우선 회귀 후 focused 79 tests PASS; image route 22/22 PASS.
- 전체 Vitest: 157 files, 921 tests PASS; 8 files/21 tests guarded skip.
- TypeScript PASS. 전체 소스 ESLint 0 errors, 기존 warnings 3.
- production build exit 0, 62/62 pages 생성. 기존 middleware deprecation 안내만 관찰.
- git diff --check PASS. 실제 PostgreSQL integration 5/5 PASS.
- 독립 Goal/Code/Security/QA/Context 모두 PASS. 보안 CRITICAL/HIGH 0. 독립 QA 29/29 PASS.

## 실제 화면 및 데이터

- 실제 관리자 세션에서 한국어 누락 9개, 대표 사진 누락 0개와 빈 상태 확인. 운영 이슈 링크 및 상품별 설명 이슈 합산 확인.
- 로컬 비활성 disposable 상품 한 건으로 빈 사진 편집기·배지·기존 설명 fallback 확인.
- 기존 편집 화면에서 KO/EN 설명 저장 후 한국어 누락 목록에서는 제외되고 사진 누락 목록에는 사진 배지만 남는 것을 확인. DB 저장값 확인 후 fixture와 옵션 삭제.
- 데스크톱 기존 viewport 및 모바일 390×844 확인. 모바일 가로 overflow 없음. 정확한 desktop1280 재측정은 하지 않았다.
- 기존 9상품/40옵션 전체 데이터 전후 SHA256 동일:
  78b02f759db0f9138a95d4ffa1c6f6f66ac0d3cc1bed360f883eff387b714689
- 기존 상품/설명/이미지/재고/상태 변경 없음. 외부 Storage/운영 DB 쓰기 없음.

## 실행 환경 및 제한

- 개발 중 일시적 PRODUCT_CONTENT_QUALITY_OPTIONS ReferenceError를 관찰했다. 다시 시도로 복구된 뒤 실제 필터·저장 흐름은 성공했고 최종 전체 테스트 및 fresh build도 통과했다. 일시 오류의 정확한 원인은 확정하지 않았다.
- 빌드 후 dev server 재시작 Ready. 빌드 중 기존 탭이 connection-refused data URL로 바뀌었고 reload가 브라우저 URL 정책에 차단되었다. 우회하지 않았으며 최종 탭 복구는 미확인이다. 사용자 직접 localhost 링크 열기로 확인 가능하다.
- 기존 unrelated ADR/roadmap 및 임시 파일 보존. commit/push/deploy 미실행.

상세 구현: implementation.md. 독립 QA: qa.md. UI 증거: list-missing-any.png, operations-linked.png, empty-photo-edit.png, description-gap-resolved.png, mobile-missing-image.png.
