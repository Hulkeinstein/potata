# 상품 목록 개선 검증

## 범위

- 기존 catalog loader/API 확장, schema/migration/기존 데이터 쓰기 없음.
- 새 GET 조건: q, brand exact, category, status, sort, page/pageSize. ID tie-breaker.
- 목록 데이터는 서버 props를 그대로 렌더하며 local shadow cache/이중 fetch 없음. native GET form과 Link로 URL이 단일 원장, 조건 적용은 page1.
- 대표 사진 편집 작업자에게 safeCatalogReturnTo helper 계약 공유. 외부 URL과 비목록 경로 차단.
- 기존 전체상품 toggle payload를 별도 narrow status endpoint로 교체. isActive 외 key 거부, content/재고/설명 쓰기 없음.

## RED / GREEN

- parser RED: 브랜드/카테고리/상태/정렬 누락, page999가100으로 제한되지 않아 1 failure/2 pass.
- status RED: 501 stub에서 expected200/400/401/403/404 다섯 failure 확인.
- UI RED: 판매 상태 필터 없음, returnTo 없음, full stale payload, network rejection으로 세 failure 확인.
- GREEN: focused7 files31 tests PASS. 기존 description PATCH6 tests 포함.
- Goal review 후 pageSize15 표시 누락을 테스트로 재현(1FAIL/4PASS), 현재 적용 크기를 선택지에 포함해 수정. focused UI5tests PASS.
- npx tsc --noEmit PASS.
- 신뢰 경계는 기존 의존성 기준 typed parser 유지. 새 의존성/설정/환경값 변경 없음.

## 실제 사용 검증

- node --import tsx driver로 실제 listAdminProducts를 호출하여 원래 로컬 데이터를 읽기만 했다.
- 기준9상품: active8/sold-out0/inactive1. 각 DB where/count 결과가 원본 옵션에서 계산한 진실값과 일치 PASS.
- 이 작업자는 기존 DB 레코드·Storage·사용자·재고를 변경하지 않았다.
- desktop/mobile browser·전체 build/test는 주 담당 통합 검증에서 수행하며 이 기록은 해당 결과를 대체하지 않는다.

## 정리

- 임시 fixtures/files/process 없음. 기존 dirty files 보존.
- commit/push/deploy 수행하지 않음.
