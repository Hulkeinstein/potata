# 상품 저장한 보기 검증

2026-10-20. 계획·구현·검증 완료. commit/push/deploy는 실행하지 않았다.

## 데이터 시작 기준

기존 로컬 Product9개/ProductVariant40개. 전체 id정렬 JSON {products,variants} SHA256:

`d46ee65aa1204ca25a17c58d5f48c17f4681f774120298f5c3a1ae26a68b5694`

이 값은 이번 요청 시작 시점의 사용자 데이터 기준이다. 이전 작업의 SHA로 되돌리지 않는다. 이번 기능은 DB 쓰기 없이 현재 관리자 계정의 브라우저 저장소만 사용한다.

## 구현과 자동 검증

- 기존 parser/serializer 재사용. 현재 적용된 검색·브랜드·카테고리·상태·누락·정렬·페이지 크기만 저장하며 page1로 정규화. 서버에서 기존 인증을 거친 관리자 ID별 localStorage 키 사용. 다른 기기와 동기화되지 않음을 UI에 명시.
- 이름/ID/query/JSON/version/entry수 경계, 중복 거부, 손상값 보존, 저장 성공 후에만 UI 성공, 최신 목록 재읽기와 storage 이벤트 지원. 삭제 확인/Escape/focus 및 bulk busy 재사용.
- TDD: 신규 모듈 부재와 기존 catalog 저장 UI 미연결 실패를 확인한 뒤 구현. focused5files44tests PASS. Node public storage adapter save/read/delete 실행 PASS.
- 전체 Vitest:163 files/983 tests PASS,9 files/25 guarded tests skipped. exit0. jsdom 문서 이동 미구현 안내는 실패가 아니다.
- TypeScript PASS. 전체 소스 ESLint0errors/기존warnings3, 변경파일0/0. production build exit0/63pages 생성. 기존 middleware deprecation 안내만 관찰.
- git diff --check PASS. source pureLOC domain54/hook32/UI49/dialog23/catalog167/page17, 모두250미만.

## 실제 인증 브라우저 QA

- 시작 시 이 계정의 저장한 보기0개. QA 누락 상품 보기 한 건만 임시 생성했다.
- applied quality=missing-any 상태에서 검색 input에 UNAPPLIED-QA-NOT-SAVED를 입력하고 조건 적용 없이 저장. 다른 조건으로 이동했다가 불러온 URL은 /admin/products?quality=missing-any이며 검색어는 빈 값이었다. 미적용 입력이 저장되지 않음을 실제 확인.
- 같은 이름 저장 시 오류, 1개 유지. 조건 초기화 후에도 저장 목록 유지. 기존 상품 전체선택9 상태에서 보기 불러오기→URL변경→선택0 확인. 상품 상태 변경 버튼은 실행하지 않았다.
- reload 후 저장한 보기1개 유지, 드롭다운 선택/불러오기 동작 확인.
- 모바일390×844에서 이름이 보이는 삭제 확인, 최초 취소 focus, Shift+Tab 실행버튼 focus, Escape취소 후 원본유지 확인. document 가로overflow false.
- 자신이 만든 QA 보기만 삭제 실행→0개 확인. viewport reset 후 최종 reload에서도0개, 기존 저장값 없음. localStorage.clear/다른 키 삭제/사용자 보기 삭제 없음.
- 실제Browser control의 exact getByLabel selectOption 한 번은 locator 불일치로 실패. 현재 DOM snapshot을 확인한 뒤 같은 UI의 semantic combobox locator로 정상 수행했다. 제품 오류로 분류하지 않았다.

## 보존·독립 검토·서버

- 최종 Product9/Variant40 전체 지문은 시작 SHA와 동일. DB 쓰기, 임시 상품 생성, 외부 Storage/API/schema/dependency 변경 없음.
- Goal PASS, Code PASS, Security PASS(CRITICAL/HIGH0), Context PASS, Independent QA PASS. qa.md는 독립 실제HTTP307/집중44test와 부모UI 증거를 구분한다.
- 현재 Next16 로컬 CLI문서의 .next/dev 분리 지원에 따라 dev43418을 유지한 채 build 실행. 빌드 후 같은 인증 IAB tab reload 정상, 저장한 보기 영역/0개 확인, 탭 deliverable 유지. 이전처럼 개발서버를 중단하지 않았다.
- 물리Safari/Android, 다른 실계정 로그인, 실제 다중탭 동시쓰기 검증은 미실행. 계정분리/이벤트/예외는 컴포넌트 테스트로 검증. localStorage 동시쓰기 완전원자성은 보장하지 않으며 UI에 브라우저 저장 한계를 명시한다.
- 기존 unrelated ADR/roadmap/임시파일 보존. 커밋·푸시·배포는 후속 승인 전 제외.

UI 증거: desktop-persisted.png(테스트 보기 존재 시점), mobile-delete-confirm.png, final-cleaned.png. 상세 구현은 implementation.md 참조.
