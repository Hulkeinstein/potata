# 상품 정보 누락 관리 구현 검증

## 범위

- 공통 누락 판정은 `undefined`를 미조회로 보존하고, null/빈 문자열/Unicode 공백을 누락으로 분류한다.
- 상품 목록에서 전체·모든 누락·한국어·영어·대표 사진 필터를 제공한다. 검색/브랜드/카테고리/판매 상태와 함께 서버에서 적용하고 동일 조건으로 count/list를 조회한다.
- 선택된 누락 필터에서만 후보의 id/설명/사진 주소를 읽고 페이지네이션 전에 판정한다. 후보 수에 비례하는 O(N) 비용이며 대규모 카탈로그에서는 별도 최적화가 필요하다. 전체 보기에는 추가 스캔이 없다.
- 기존 운영 이슈 로더와 공통 판정을 재사용한다. 활성 상품의 설명 누락은 언어별로 중복 생성하지 않고 상품당 경고 하나/영향 1개로 표시한다. 기존 사진 이슈 종류는 유지한다.
- 고객 설명 fallback, 기존 관리 경로와 데이터는 유지한다. 외부 사진 URL 연결 상태는 검사하지 않는다.
- 빈 대표 사진도 기존 편집기에서 복구할 수 있다. 정확한 CAS 비교를 위해 UI는 URI 인코딩 토큰을 보내고 API는 선택적 인코딩 표식을 검증한다. 기존 plain 토큰도 지원한다. 인코딩 입력 상한 49,152자, 디코딩 후 4,096자이며 이중 디코딩하지 않는다.

## RED → GREEN

1. 공통 판정/운영 이슈/쿼리/UI 초기 회귀: 실제 10 failed / 8 passed → 18/18 PASS.
2. 서버 필터와 빈 썸네일 보호 회귀: 실제 4 failed / 2 passed → 관련 테스트 GREEN.
3. 빈 사진 수정 경로: 실제 5 failed / 23 passed. 빈 사진 편집 제어 누락, Next Image 잘못된 src, API 빈 토큰 거부와 multipart 줄바꿈 정규화를 재현했다. 수정 후 28/28 PASS.
4. 최종 집중 검증: 14 files / 79 tests PASS. 최종 인코딩 상한 수정 후 이미지 API 단독 재실행 22/22 PASS.
5. Sandbox Vitest 임시 파일 rename EPERM은 테스트 실행 전 환경 오류였다. 동일 테스트를 승인된 실행 환경에서 재실행하여 통과했다.

## 실제 로컬 DB 검증

- `RUN_INTEGRATION=1`, localhost/127.0.0.1 및 `potata_dev` 강제 가드.
- disposable 브랜드와 상품 4개만 생성했다. null/공백/legacy fallback/두 언어 누락/비활성/복합 필터/정렬·페이지네이션/누락 복구/빈 사진 및 LF 공백 CAS 복구를 5개 테스트로 검증했다.
- 실제 PostgreSQL 5/5 PASS. 생성한 id와 고유 브랜드 조건으로 fixture를 정리했다.
- 정리 후 기준: 상품 9개, 옵션 40개.
- 전체 Product + ProductVariant id 정렬 JSON SHA256: `78b02f759db0f9138a95d4ffa1c6f6f66ac0d3cc1bed360f883eff387b714689` — 최초 기준과 동일.
- 외부 Storage 쓰기, 운영 DB 변경, 마이그레이션, 기존 상품 수정 없음.

## 정적 검증 / 인계

- TypeScript `tsc --noEmit`: PASS.
- 변경 source/test 대상 ESLint: PASS, 출력 없음.
- 전체 회귀/production build/실제 브라우저 및 최종 독립 검토는 부모 에이전트가 수행한다. 이 문서는 해당 결과를 선행 주장하지 않는다.
- source freeze 이후 부모의 브라우저 QA fixture 작업은 위 기준 fingerprint 이후 별도 작업이다.
- commit/push/deploy는 수행하지 않았다. 기존 ADR/roadmap 및 무관한 임시 파일은 보존했다.
