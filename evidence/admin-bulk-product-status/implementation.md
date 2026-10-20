# 상품 일괄 판매 상태 구현 기록

2026-10-20. 계획: plans/admin-bulk-product-status.md. 기존 unrelated ADR/roadmap/임시 파일은 수정하지 않았다.

## 실패 우선 검증

- 신규 parser/route 부재 및 기존 batch writer/선택 UI 부재를 테스트로 먼저 고정했다.
- 최초 sandbox Vitest temp rename EPERM은 같은 테스트를 승인된 로컬 권한으로 재실행해 분리했다. 실제 RED: domain/UI 8개 실패(함수 없음, checkbox 없음).
- GREEN: 기존 단일 API/UI/read/누락 필터 회귀를 포함한 8 files/47 tests PASS.
- TypeScript PASS. 변경 source/test ESLint 0 errors. 최초 integration test의 미사용 destructuring 변수 warnings는 해당 비교를 단순화해 제거했다.
- 독립 code review finding: 상태 refresh remount가 처리 결과/캐시 지연 안내를 지웠다. 별도 회귀 테스트 RED 확인 후 query-scoped feedback과 snapshot-scoped 선택 상태를 분리해 GREEN.

## 구현 계약

- 기존 상품 목록에 현재 페이지 전체/개별 선택, 선택 수·해제, 판매 중지·재노출 확인 dialog 추가.
- query/페이지/보이는 id·name·isActive snapshot이 바뀌면 선택과 확인은 초기화된다. 성공/캐시 경고는 같은 query의 server refresh 후에도 유지된다.
- 확인 창에서 모든 선택 상품명·현재 상태·목표 상태를 보여주고 취소/Escape/focus loop·복원 제공. 재고0/수동품절은 재노출해도 구매불가 안내.
- 단일/다중 상태 변경은 기존 도메인의 좁은 writer를 공유한다. updateMany는 isActive만 설정하며 transaction 안에서 count 불일치 시 rollback.
- 새 PATCH /api/admin/catalog/status는 auth/admin 선행, 제한된 JSON reader, strict ids+boolean, 1~50 unique IDs, 길이200 및 unknown key 검사를 사용한다.
- 성공 commit 후 products 태그 만료. 캐시 실패는 이미 저장됐다는 success+warning으로 표현하며 실패/timeout을 미적용으로 단정하지 않는다. 중복 실행은 기존 ref lock 공유로 차단.
- 마지막 저장 상태 우선. schema/deps/migration/자동재고조정 없음.

## 실제 로컬 DB / HTTP

- RUN_INTEGRATION=1 + .env.local로 localhost/potata_dev guard 통과 후 4 tests PASS.
- disposable 2상품·4옵션에서 판매 중지, 재노출 반복, missing ID 포함 전체 rollback, 기존 단일 missing=false를 실제 PostgreSQL로 검증했다.
- Product는 isActive/자동 updatedAt 외 필드 동일, 옵션의 stock0/stock5·수동품절 및 updatedAt 포함 전체 행 동일 확인.
- fixture는 고유 brand+id 조건으로 정리했다. original Product+Variant 정렬 JSON SHA256 전후 동일 assertion PASS.
- 실행 중 서버에 무cookie 실제 PATCH → HTTP401 Unauthorized. 요청은 실제 상품 ID가 아니며 auth 단계에서 차단됐다.
- 부모가 이후 별도의 browser fixtures를 생성·관리하므로 그 정리는 부모 소유다. 공유 IAB는 조작하지 않았다.

## 크기 및 경계

source pureLOC: catalogClient164, confirmation42, catalogdomain90, input13, route33. 각 책임을 좁게 유지했고 untrusted input은 route에서 typed input으로 바꿨다. any/assertion/새 tagged-variant 분기 없음.

부모가 전체 test/build/브라우저 최종 QA를 통합한다. 운영 DB/Storage/commit/push/deploy는 실행하지 않았다.
