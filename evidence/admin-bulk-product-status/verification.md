# 상품 일괄 상태 관리 검증 기록

## 시작 기준

2026-10-20 로컬 potata_dev에서 기존 Product/ ProductVariant를 id순 전체 조회했다. 상품 9개, 옵션 40개. JSON {products,variants} SHA256:

`78b02f759db0f9138a95d4ffa1c6f6f66ac0d3cc1bed360f883eff387b714689`

기존 데이터는 테스트 변경 대상이 아니다. 실제 변경 QA는 disposable 로컬 fixture만 사용한다. 운영 DB/외부 Storage/commit/push/배포는 범위 밖이다.

## 최종 자동 검증

- TDD RED: 미구현 domain/UI 8개 실패와 parser/route 부재를 재현한 뒤 구현. focused 47 tests PASS.
- 실제 PostgreSQL integration 4/4 PASS: 일괄 중지/재노출, 같은 목표 재실행, missing 대상 전체 rollback, singleton notfound 호환. 옵션 전체 행과 상태 외 상품 필드 보존.
- 전체 Vitest: 161 files / 953 tests PASS, 9 files / 25 guarded tests skipped. 종료 코드0. jsdom 문서 이동 미구현 안내는 실패가 아니다.
- TypeScript PASS. 전체 소스 ESLint 0 errors / 기존 warnings3. 변경 파일 lint0/0.
- production build exit0, 63/63 generated. 기존 middleware deprecation 안내 외 blocker 없음.
- git diff --check PASS. 소스 pureLOC 모두250미만.

## 실제 브라우저 QA

- 실제 로그인 관리자 IAB에서 기존9상품 전체 선택→확인 창 상품명9개→Escape 취소/원래 버튼 focus 복원→선택 해제0 확인. 기존 상품 변경은 하지 않았다.
- 로컬 fixture qa-bulk-browser-20261020-a/b, brand QA-BULK-BROWSER만 생성(처음 비활성). 각 S재고0, M재고5+수동품절, 가격123.
- 기존 브랜드/누락 필터로 fixture2개만 표시. query 변경 시 이전 선택0으로 초기화.
- 일괄 재노출 실행 → 처리2개 안내 유지, 선택0, 두 상품은 재고조건 때문에 계속 품절/구매가능옵션0/2로 표시.
- 모바일390×844에서 전체선택→중지 확인→Shift+Tab/Tab focus loop→실행→두 상품 판매중지 확인. document 가로 overflow false. viewport override reset 완료.
- 코드 리뷰가 찾은 refresh 후 성공/캐시경고 유실은 RED→GREEN으로 수정했다. 안정적인 query wrapper가 결과 안내를 소유하고 snapshot child는 선택/확인만 초기화한다. 실제 서버 refresh 뒤 처리 안내 유지도 확인했다.
- fixture 상태/가격/stock/manualSoldOut 검사 PASS 후 정확한 id+brand로 두 임시상품과 연관 옵션 정리. 최종 기존9상품/40옵션 SHA256는 시작값과 완전히 동일하다.

## 독립 검토

Goal PASS, Code PASS(초기 MAJOR 해결 후 재검토), Security PASS(CRITICAL/HIGH0), Context PASS, QA PASS. 독립 QA는 무인증 실제 PATCH401 및 focused7files/46tests를 실행했다. 세부 범위는 qa.md, 구현 증거는 implementation.md 참조.

## 서버와 제한

- 빌드를 위해 기존 dev19530 정상종료, 빌드 성공 후 dev43418 Ready740ms로 재시작. /api/health 실제 HTTP200 확인.
- 빌드 중 기존 브라우저 탭이 connection-refused data URL로 바뀌었고 최종 reload가 브라우저 URL 정책에 막혔다. 우회하지 않았다. 따라서 빌드 후 탭 재복구는 미확인이고 사용자가 직접 localhost 주소를 열어야 한다. 실제 인증 UI/모바일 mutation QA는 빌드 전에 최종 코드로 완료했다.
- 물리 Safari/Android나 실운영 변경은 하지 않았다. 기존 unrelated ADR/roadmap/임시파일 보존, commit/push/배포 미실행.

UI 증거: desktop-confirm.png, desktop-restored-soldout.png, mobile-confirm.png, mobile-stopped.png.
